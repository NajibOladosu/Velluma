/**
 * POST /api/book/[slug]/bookings
 * Public — creates a booking. Body:
 *   { meetingTypeId, startsAt (ISO), guestName, guestEmail, guestPhone?, notes? }
 *
 * Also creates a pipeline_lead row sourced from this booking.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Body {
  meetingTypeId?: string
  startsAt?: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  notes?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  let body: Body = {}
  try { body = await request.json() } catch { /* ok */ }

  const guestName = body.guestName?.trim()
  const guestEmail = body.guestEmail?.trim().toLowerCase()
  if (!body.meetingTypeId || !body.startsAt) {
    return NextResponse.json({ error: "meetingTypeId and startsAt required" }, { status: 400 })
  }
  if (!guestName || !guestEmail || !EMAIL_RE.test(guestEmail)) {
    return NextResponse.json({ error: "guestName and a valid guestEmail required" }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: page } = await supabase
    .from("booking_pages")
    .select("id, user_id, timezone")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })

  const { data: mt } = await supabase
    .from("booking_meeting_types")
    .select("id, page_id, duration_minutes, name")
    .eq("id", body.meetingTypeId)
    .eq("page_id", page.id)
    .eq("is_active", true)
    .maybeSingle()
  if (!mt) return NextResponse.json({ error: "Meeting type not found" }, { status: 404 })

  const startMs = new Date(body.startsAt).getTime()
  if (isNaN(startMs)) return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 })
  const endsAt = new Date(startMs + mt.duration_minutes * 60_000).toISOString()

  // Conflict guard
  const { data: conflict } = await supabase
    .from("bookings")
    .select("id")
    .eq("page_id", page.id)
    .eq("status", "confirmed")
    .lt("starts_at", endsAt)
    .gt("ends_at", new Date(startMs).toISOString())
    .maybeSingle()
  if (conflict) return NextResponse.json({ error: "Slot no longer available" }, { status: 409 })

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      page_id: page.id,
      meeting_type_id: mt.id,
      user_id: page.user_id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: body.guestPhone?.trim() || null,
      starts_at: new Date(startMs).toISOString(),
      ends_at: endsAt,
      notes: body.notes?.trim() || null,
      status: "confirmed",
    })
    .select("id, cancellation_token, starts_at, ends_at")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create a pipeline lead — best-effort; don't fail the booking if it errors.
  await supabase.from("pipeline_leads").insert({
    tenant_id: page.user_id,
    name: guestName,
    email: guestEmail,
    phone: body.guestPhone?.trim() || null,
    source: "booking",
    stage: "inbox",
    source_booking_id: booking.id,
    metadata: { meeting_type: mt.name, starts_at: booking.starts_at },
  })

  return NextResponse.json({
    bookingId: booking.id,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    cancellationUrl: `/book/${slug}/cancel/${booking.cancellation_token}`,
  }, { status: 201 })
}
