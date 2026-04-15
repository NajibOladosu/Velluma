/**
 * GET /api/proposals/[id]/pdf
 *
 * Generates and streams a PDF for the given proposal.
 * Authentication: Supabase session cookie (same as all dashboard routes).
 *
 * Response: application/pdf with Content-Disposition: attachment
 */
import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ProposalDocument, type ProposalPdfData } from "@/lib/pdf/proposal-pdf"

// Default legal clauses included in every proposal PDF unless overridden
const DEFAULT_CLAUSES = [
  {
    title: "Intellectual Property Transfer",
    body: "Upon receipt of full payment, all intellectual property rights created during the course of this project shall be irrevocably transferred to the Client.",
  },
  {
    title: "Confidentiality & Non-Disclosure",
    body: "Both parties agree to hold in confidence all proprietary information disclosed during the term of this agreement. This obligation extends for two (2) years after termination.",
  },
  {
    title: "Limitation of Liability",
    body: "Total liability shall not exceed the total amount paid under this agreement. Neither party shall be liable for indirect or consequential damages.",
  },
  {
    title: "Revision Policy",
    body: "This agreement includes two (2) rounds of revisions per deliverable. Additional revisions are billed at the agreed hourly rate.",
  },
  {
    title: "Termination Clause",
    body: "Either party may terminate with fourteen (14) days written notice. The Client shall pay for all work completed to date.",
  },
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // ── Auth ─────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // read-only in route handlers
      },
    },
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // ── Fetch proposal ────────────────────────────────────────────────────────
  const { data: row, error: fetchError } = await supabase
    .from("projects")
    .select("*, clients(name, email)")
    .eq("id", id)
    .single()

  if (fetchError || !row) {
    return new NextResponse("Proposal not found", { status: 404 })
  }

  // ── Fetch freelancer profile ───────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  // ── Build PDF data ────────────────────────────────────────────────────────
  const meta = (row.metadata as Record<string, unknown>) ?? {}
  const clientName: string =
    (row.clients as { name?: string; email?: string } | null)?.name ??
    (row.clients as { name?: string; email?: string } | null)?.email ??
    "Client"
  const clientEmail: string | null =
    (row.clients as { email?: string } | null)?.email ?? null

  // Extract structured metadata fields if present
  const tiers = meta.tiers as ProposalPdfData["tiers"] | undefined
  const addOns = (meta.add_ons ?? meta.addOns) as ProposalPdfData["addOns"] | undefined
  const legalClauses = (meta.legal_clauses ?? meta.legalClauses) as ProposalPdfData["legalClauses"] | undefined
  const scopeItems = meta.scope_items as string[] | undefined
  const welcomeMessage = meta.welcome_message as string | undefined

  const pdfData: ProposalPdfData = {
    id: row.id as string,
    title: row.title as string,
    client: clientName,
    clientEmail,
    status: row.status as string,
    value: row.total_budget ? Number(row.total_budget) : null,
    createdAt: row.created_at as string,
    expiresAt: meta.expires_at as string | null,
    template: meta.template as string | null,
    content: meta.content,
    welcomeMessage: welcomeMessage ?? null,
    scopeItems,
    tiers,
    addOns,
    legalClauses: legalClauses ?? DEFAULT_CLAUSES,
    depositPercent: meta.deposit_percent ? Number(meta.deposit_percent) : 50,
    milestones: meta.milestones ? Number(meta.milestones) : undefined,
    freelancerName: profile?.full_name ?? user.email ?? null,
    freelancerEmail: profile?.email ?? user.email ?? null,
  }

  // ── Render PDF ────────────────────────────────────────────────────────────
  let buffer: Buffer
  try {
    buffer = await renderToBuffer(
      React.createElement(ProposalDocument, { data: pdfData }),
    )
  } catch (err) {
    console.error("[pdf] render error:", err)
    return new NextResponse("Failed to generate PDF", { status: 500 })
  }

  // ── Safe filename ─────────────────────────────────────────────────────────
  const safeName = (row.title as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  // NextResponse expects BodyInit — convert Node.js Buffer to Uint8Array
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${safeName}.pdf"`,
      "Content-Length": String(buffer.byteLength),
      // No caching — each export should reflect current data
      "Cache-Control": "no-store",
    },
  })
}
