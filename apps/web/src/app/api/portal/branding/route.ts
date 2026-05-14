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

  // Prefer the §7 Business Profile on public.profiles. Fall back to the
  // legacy user_metadata.branding blob (kept for existing freelancers who
  // haven't migrated yet — the new Business Profile form writes to
  // profiles, the older Branding form writes to user_metadata).
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "logo_url, brand_accent_hex, display_name, company_name, legal_business_name",
    )
    .eq("id", freelancerId)
    .maybeSingle<{
      logo_url: string | null
      brand_accent_hex: string | null
      display_name: string | null
      company_name: string | null
      legal_business_name: string | null
    }>()

  const { data: user } = await supabase.auth.admin.getUserById(freelancerId)
  const meta = (user.user?.user_metadata ?? {}) as Record<string, unknown>
  const branding = (meta.branding ?? {}) as Record<string, string | null>

  return NextResponse.json({
    logoUrl: profile?.logo_url ?? branding.logo_url ?? null,
    coverUrl: branding.cover_url ?? null,
    accentHex: profile?.brand_accent_hex ?? branding.accent_hex ?? "#18181b",
    tagline: branding.tagline ?? null,
    workspaceName:
      profile?.legal_business_name ??
      profile?.company_name ??
      profile?.display_name ??
      (meta.workspace_name as string | null) ??
      (meta.full_name as string | null) ??
      null,
  })
}
