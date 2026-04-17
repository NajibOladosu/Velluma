/**
 * GET /api/proposals/[id]/pdf
 *
 * Generates a PDF for the given proposal.
 * Authentication: Supabase session cookie (same as all dashboard routes).
 *
 * Query params:
 *   ?inline=1  →  Content-Disposition: inline  (browser preview tab)
 *   (default)  →  Content-Disposition: attachment  (file download)
 *
 * Response: application/pdf
 */
import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React, { type JSXElementConstructor } from "react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ProposalDocument, type ProposalPdfData } from "@/lib/pdf/proposal-pdf"

// ---------------------------------------------------------------------------
// Static catalogs — must stay in sync with the builder's hardcoded data
// ---------------------------------------------------------------------------

const STANDARD_TIERS: Record<string, { name: string; description: string; price: number }> = {
  foundation: { name: "Foundation", description: "Core setup and essential features.", price: 2500 },
  scale:       { name: "Scale",       description: "Advanced features for growing teams.",      price: 5500 },
  enterprise:  { name: "Enterprise",  description: "Full-service for established brands.",      price: 9500 },
}

const CLAUSE_CATALOG: Record<string, { title: string; body: string }> = {
  ip: {
    title: "Intellectual Property Transfer",
    body: "Upon receipt of full payment, all intellectual property rights, including but not limited to copyrights, trademarks, and trade secrets created during the course of this project, shall be irrevocably transferred to the Client.",
  },
  confidentiality: {
    title: "Confidentiality & Non-Disclosure",
    body: "Both parties agree to hold in confidence all proprietary information disclosed during the term of this agreement. This obligation extends for a period of two (2) years after the termination of this agreement.",
  },
  liability: {
    title: "Limitation of Liability",
    body: "In no event shall the Service Provider be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues. Total liability shall not exceed the total amount paid under this agreement.",
  },
  revisions: {
    title: "Revision Policy",
    body: "This agreement includes two (2) rounds of revisions per deliverable. Additional revision rounds may be requested at a rate of $150/hour.",
  },
  termination: {
    title: "Termination Clause",
    body: "Either party may terminate this agreement with fourteen (14) days written notice. Upon termination, the Client shall pay for all work completed to date.",
  },
}

// Default clauses used when no enabled_clauses are stored yet
const DEFAULT_CLAUSE_IDS = ["ip", "confidentiality", "liability", "revisions", "termination"]

// ---------------------------------------------------------------------------
// HTML → plain-text helper (scope_content is stored as TipTap HTML)
// ---------------------------------------------------------------------------

function htmlToLines(html: string): string[] {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

interface AddOnRow { id: string; label: string; price: number; enabled: boolean }
interface CustomTierRow { id: string; title: string; price: number; description: string; features: string[] }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const inline = request.nextUrl.searchParams.get("inline") === "1"

  // ── Auth ─────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
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

  // ── Fetch proposal (correct join: crm_clients, not clients) ───────────────
  const { data: row, error: fetchError } = await supabase
    .from("projects")
    .select("*, crm_clients(name, email)")
    .eq("id", id)
    .single()

  if (fetchError || !row) {
    return new NextResponse("Proposal not found", { status: 404 })
  }

  // ── Fetch freelancer profile (display_name is the correct column) ────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single()

  // ── Reconstruct PDF data from stored metadata ─────────────────────────────
  const meta = (row.metadata as Record<string, unknown>) ?? {}

  const clientRecord = row.crm_clients as { name?: string; email?: string } | null
  const clientName: string = clientRecord?.name ?? clientRecord?.email ?? "Client"
  const clientEmail: string | null = clientRecord?.email ?? null

  // Tiers: use selected_tier + custom_tiers
  const selectedTierId = meta.selected_tier as string | undefined
  const customTiers = (meta.custom_tiers as CustomTierRow[] | undefined) ?? []
  let pdfTiers: { name: string; description: string; price: number }[] = []

  if (selectedTierId) {
    if (STANDARD_TIERS[selectedTierId]) {
      pdfTiers = [STANDARD_TIERS[selectedTierId]]
    } else {
      const ct = customTiers.find((t) => t.id === selectedTierId)
      if (ct) pdfTiers = [{ name: ct.title, description: ct.description, price: ct.price }]
    }
  } else if (customTiers.length > 0) {
    pdfTiers = customTiers.map((t) => ({
      name: t.title,
      description: t.description,
      price: t.price,
    }))
  } else {
    // No tier chosen yet — show all standard tiers as reference
    pdfTiers = Object.values(STANDARD_TIERS)
  }

  // Add-ons: filter to enabled only
  const rawAddOns = (meta.add_ons as AddOnRow[] | undefined) ?? []
  const pdfAddOns = rawAddOns
    .filter((a) => a.enabled)
    .map((a) => ({ label: a.label, price: a.price }))

  // Legal clauses: reconstruct from enabled_clauses IDs + extra_clauses
  const enabledClauseIds = (meta.enabled_clauses as string[] | undefined) ?? DEFAULT_CLAUSE_IDS
  const extraClauses = (meta.extra_clauses as { title: string; body: string }[] | undefined) ?? []
  const pdfClauses: { title: string; body: string }[] = [
    ...enabledClauseIds.map((cid) => CLAUSE_CATALOG[cid]).filter(Boolean),
    ...extraClauses,
  ]

  // Scope: stored as HTML from TipTap editor — convert to plain-text lines
  const scopeHtml = meta.scope_content as string | undefined
  const scopeItems = scopeHtml ? htmlToLines(scopeHtml) : undefined

  const pdfData: ProposalPdfData = {
    id: row.id as string,
    title: row.title as string,
    client: clientName,
    clientEmail,
    status: row.status as string,
    value: row.total_budget ? Number(row.total_budget) : null,
    createdAt: row.created_at as string,
    expiresAt: (meta.expires_at as string | null) ?? null,
    template: (meta.template as string | null) ?? null,
    welcomeMessage: (meta.welcome_message as string | undefined) ?? null,
    scopeItems,
    tiers: pdfTiers,
    addOns: pdfAddOns,
    legalClauses: pdfClauses.length > 0 ? pdfClauses : undefined,
    depositPercent: meta.deposit_percent ? Number(meta.deposit_percent) : 50,
    milestones: meta.milestones ? Number(meta.milestones) : undefined,
    freelancerName: (profile as { display_name?: string } | null)?.display_name ?? user.email ?? null,
    freelancerEmail: user.email ?? null,
  }

  // ── Render PDF ────────────────────────────────────────────────────────────
  let buffer: Buffer
  try {
    buffer = await renderToBuffer(
      React.createElement(ProposalDocument, { data: pdfData }) as React.ReactElement<
        DocumentProps,
        string | JSXElementConstructor<unknown>
      >,
    )
  } catch (err) {
    console.error("[pdf] render error:", err)
    return new NextResponse("Failed to generate PDF", { status: 500 })
  }

  // ── Response ──────────────────────────────────────────────────────────────
  const safeName = (row.title as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  const disposition = inline
    ? `inline; filename="proposal-${safeName}.pdf"`
    : `attachment; filename="proposal-${safeName}.pdf"`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  })
}
