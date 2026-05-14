/**
 * GET  /api/book/cancel/[token] — public: returns booking details for the
 *                                 cancellation landing page.
 * POST /api/book/cancel/[token] — public: cancels the booking.
 *
 * The cancellation_token is a single-use, opaque string emitted by the
 * /api/book/[slug]/bookings POST route. Hits the booking by token rather
 * than id so the URL is the credential.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

interface BookingPublicRow {
  id: string
  starts_at: string
  ends_at: string
  guest_name: string
  guest_email: string
  status: string
  cancelled_at: string | null
  notes: string | null
  page: { slug: string; title: string; timezone: string } | null
  meeting_type: { name: string; duration_minutes: number } | null
}

async function loadByToken(token: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, ends_at, guest_name, guest_email, status, cancelled_at, notes, " +
        "page:booking_pages(slug, title, timezone), " +
        "meeting_type:booking_meeting_types(name, duration_minutes)",
    )
    .eq("cancellation_token", token)
    .maybeSingle<BookingPublicRow>()
  return data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const booking = await loadByToken(token)
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  return NextResponse.json({ booking })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  let body: { reason?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  const supabase = await createServiceClient()
  const booking = await loadByToken(token)
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (booking.status === "cancelled") {
    return NextResponse.json({ ok: true, alreadyCancelled: true })
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: body.reason?.trim() || null,
    })
    .eq("id", booking.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
