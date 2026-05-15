/**
 * POST /api/book/cancel/[token]/reschedule
 *
 * Public reschedule endpoint. Same single-use cancellation_token as the
 * cancel route — the URL is the credential. Body:
 *
 *   { startsAt: ISO string }
 *
 * Validates the new slot doesn't collide with any other confirmed booking
 * on the same page, recomputes ends_at from the meeting type duration,
 * stamps rescheduled_from_starts_at, and returns the new times.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

interface BookingRow {
  id: string
  page_id: string
  starts_at: string
  ends_at: string
  status: string
  meeting_type_id: string | null
  meeting_type: { duration_minutes: number } | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  let body: { startsAt?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  if (!body.startsAt) {
    return NextResponse.json({ error: "startsAt required" }, { status: 400 })
  }
  const newStart = new Date(body.startsAt)
  if (Number.isNaN(newStart.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, page_id, starts_at, ends_at, status, meeting_type_id, " +
        "meeting_type:booking_meeting_types(duration_minutes)",
    )
    .eq("cancellation_token", token)
    .maybeSingle<BookingRow>()
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking is cancelled — book a new slot instead" }, { status: 409 })
  }

  const durationMs =
    (booking.meeting_type?.duration_minutes ?? 30) * 60_000 ||
    (new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime())
  const newEnd = new Date(newStart.getTime() + durationMs).toISOString()

  // Conflict guard against other confirmed bookings on the same page.
  const { data: conflict } = await supabase
    .from("bookings")
    .select("id")
    .eq("page_id", booking.page_id)
    .eq("status", "confirmed")
    .neq("id", booking.id)
    .lt("starts_at", newEnd)
    .gt("ends_at", newStart.toISOString())
    .maybeSingle()
  if (conflict) {
    return NextResponse.json({ error: "Slot conflicts with another booking" }, { status: 409 })
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      rescheduled_from_starts_at: booking.starts_at,
      starts_at: newStart.toISOString(),
      ends_at: newEnd,
      status: "confirmed",
    })
    .eq("id", booking.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    startsAt: newStart.toISOString(),
    endsAt: newEnd,
  })
}
