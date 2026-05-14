/**
 * GET /api/book/[slug]
 * Public — returns the freelancer's booking page + active meeting types.
 * Service role used because clients have no Supabase identity.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createServiceClient()

  const { data: page, error } = await supabase
    .from("booking_pages")
    .select("id, user_id, slug, title, intro, timezone, weekday_availability, buffer_minutes, notice_hours, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })

  const { data: meetingTypes } = await supabase
    .from("booking_meeting_types")
    .select("id, name, description, duration_minutes, location_type, location_detail, price, currency")
    .eq("page_id", page.id)
    .eq("is_active", true)
    .order("order_index")

  // §7 Business Profile drives the brand header on the public booking page.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, company_name, legal_business_name, logo_url, brand_accent_hex",
    )
    .eq("id", page.user_id)
    .maybeSingle<{
      display_name: string | null
      company_name: string | null
      legal_business_name: string | null
      logo_url: string | null
      brand_accent_hex: string | null
    }>()

  const branding = {
    displayName:
      profile?.legal_business_name?.trim() ||
      profile?.company_name?.trim() ||
      profile?.display_name?.trim() ||
      null,
    logoUrl:    profile?.logo_url ?? null,
    accentHex:  profile?.brand_accent_hex ?? "#18181b",
  }

  return NextResponse.json({ page, meetingTypes: meetingTypes ?? [], branding })
}
