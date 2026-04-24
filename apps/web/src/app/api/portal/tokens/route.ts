/**
 * POST /api/portal/tokens
 *
 * Freelancer-authenticated. Issues a new scoped share link for an engagement
 * (proposal / contract / project) and returns the full URL to send to the
 * client. The client never creates an account — clicking the link sets a
 * scoped session cookie via /pt/[token].
 *
 * Body:
 * {
 *   engagementType: "proposal" | "contract" | "project",
 *   engagementId: string (uuid),
 *   clientEmail: string,
 *   expiresInDays?: number (default 30, max 365),
 *   note?: string
 * }
 *
 * Response: { url: string, token: string, expiresAt: string }
 */

import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { createClient, createServiceClient } from "@/utils/supabase/server"
import type { PortalEngagementType } from "@/lib/portal/session"
import { writeAudit, AuditEvents } from "@/lib/audit"

const ENGAGEMENT_TYPES: PortalEngagementType[] = ["proposal", "contract", "project"]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Body {
  engagementType?: string
  engagementId?: string
  clientEmail?: string
  expiresInDays?: number
  note?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const engagementType = body.engagementType as PortalEngagementType | undefined
  const engagementId = body.engagementId?.trim()
  const clientEmail = body.clientEmail?.trim().toLowerCase()
  const expiresInDays = Math.max(1, Math.min(365, body.expiresInDays ?? 30))
  const note = body.note?.trim() || null

  if (!engagementType || !ENGAGEMENT_TYPES.includes(engagementType)) {
    return NextResponse.json(
      { error: "engagementType must be one of: proposal, contract, project" },
      { status: 400 },
    )
  }
  if (!engagementId || !UUID_RE.test(engagementId)) {
    return NextResponse.json({ error: "engagementId must be a valid UUID" }, { status: 400 })
  }
  if (!clientEmail || !EMAIL_RE.test(clientEmail)) {
    return NextResponse.json({ error: "clientEmail must be a valid email" }, { status: 400 })
  }

  // Verify the freelancer owns this engagement before minting a token.
  // RLS on each source table enforces ownership, so a plain select is safe:
  // if they can't see the row, we refuse to mint.
  const ownershipCheck = await verifyOwnership(supabase, engagementType, engagementId)
  if (!ownershipCheck.ok) {
    return NextResponse.json({ error: ownershipCheck.reason }, { status: 403 })
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

  // Insert via service role so we don't depend on RLS for the token row
  // itself (RLS policy exists for owner reads/updates but we want minimal
  // coupling here).
  const service = await createServiceClient()
  const { error: insertError } = await service.from("portal_access_tokens").insert({
    token,
    client_email: clientEmail,
    engagement_type: engagementType,
    engagement_id: engagementId,
    freelancer_id: user.id,
    expires_at: expiresAt.toISOString(),
    note,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const origin =
    request.headers.get("x-forwarded-origin") ??
    new URL(request.url).origin
  const url = `${origin}/pt/${token}`

  await writeAudit({
    userId: user.id,
    action: AuditEvents.PortalTokenIssued,
    resourceType: "portal",
    resourceId: engagementId,
    details: { engagement_type: engagementType, client_email: clientEmail, expires_at: expiresAt.toISOString(), note },
    request,
  })

  return NextResponse.json({
    url,
    token,
    expiresAt: expiresAt.toISOString(),
  })
}

type AnySupabase = Awaited<ReturnType<typeof createClient>>

async function verifyOwnership(
  supabase: AnySupabase,
  type: PortalEngagementType,
  id: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const table =
    type === "contract" ? "contracts" : type === "project" ? "projects" : "projects"
  //   ^^ Proposals live on the `projects` table in this codebase (see
  //   lib/queries/proposals.ts). If a dedicated `proposals` table is added
  //   later, update this mapping.

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (error) return { ok: false, reason: error.message }
  if (!data) return { ok: false, reason: `${type} not found or access denied` }
  return { ok: true }
}
