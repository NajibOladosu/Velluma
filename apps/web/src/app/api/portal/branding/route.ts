/**
 * GET /api/portal/branding
 *
 * Returns branding for the freelancer behind the client's *first* contract
 * engagement. When a client holds multiple engagements from different
 * freelancers, the portal layout picks the first contract's brand —
 * individual engagement pages can still override.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { requirePortalSession } from "@/lib/portal/guard"

const DEFAULT = { logoUrl: null, coverUrl: null, accentHex: "#18181b", tagline: null, workspaceName: null }

export async function GET(request: NextRequest) {
  const guard = await requirePortalSession(request)
  if (guard.response) return NextResponse.json(DEFAULT)

  const firstContract = guard.contractIds[0]
  if (!firstContract) return NextResponse.json(DEFAULT)

  const supabase = await createServiceClient()
  const { data: contract } = await supabase
    .from("contracts")
    .select("freelancer_id, creator_id")
    .eq("id", firstContract)
    .maybeSingle()

  const freelancerId = contract?.freelancer_id ?? contract?.creator_id
  if (!freelancerId) return NextResponse.json(DEFAULT)

  const { data: user } = await supabase.auth.admin.getUserById(freelancerId)
  const meta = (user.user?.user_metadata ?? {}) as Record<string, unknown>
  const branding = (meta.branding ?? {}) as Record<string, string | null>

  return NextResponse.json({
    logoUrl: branding.logo_url ?? null,
    coverUrl: branding.cover_url ?? null,
    accentHex: branding.accent_hex ?? "#18181b",
    tagline: branding.tagline ?? null,
    workspaceName: (meta.workspace_name as string | null) ?? (meta.full_name as string | null) ?? null,
  })
}
