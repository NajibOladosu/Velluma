/**
 * PATCH /api/book/[slug]/bookings/[id]
 *   Admin (the freelancer who owns the booking_page) cancels or reschedules.
 *
 *   body:
 *     { action: 'cancel' | 'reschedule', reason?, startsAt? }
 *
 * Cancellation also works from the public /api/book/cancel/[token] route
 * — that one uses the cancellation_token, this one uses Supabase auth.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"

interface Body {
  action?: "cancel" | "reschedule"
  reason?: string
  startsAt?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Body = {}
  try { body = await request.json() } catch { /* ok */ }
  if (!body.action) return NextResponse.json({ error: "action required" }, { status: 400 })

  const service = await createServiceClient()
  // Ownership: caller must be the booking_page user_id.
  const { data: page } = await service
    .from("booking_pages")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle<{ user_id: string }>()
  if (!page || page.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (body.action === "cancel") {
    const { error } = await service
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.reason?.trim() || null,
      })
      .eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === "reschedule") {
    if (!body.startsAt) {
      return NextResponse.json({ error: "startsAt required" }, { status: 400 })
    }
    const newStart = new Date(body.startsAt)
    if (Number.isNaN(newStart.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 })
    }

    // Pull current duration + page to compute new ends_at and guard collision.
    const { data: cur } = await service
      .from("bookings")
      .select("page_id, starts_at, ends_at, meeting_type_id, status, " +
              "meeting_type:booking_meeting_types(duration_minutes)")
      .eq("id", id)
      .maybeSingle<{
        page_id: string
        starts_at: string
        ends_at: string
        meeting_type_id: string | null
        status: string
        meeting_type: { duration_minutes: number } | null
      }>()
    if (!cur) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

    const durationMs =
      (cur.meeting_type?.duration_minutes ?? 30) * 60_000 ||
      (new Date(cur.ends_at).getTime() - new Date(cur.starts_at).getTime())
    const newEnd = new Date(newStart.getTime() + durationMs).toISOString()

    // Conflict guard against confirmed bookings on the same page.
    const { data: conflict } = await service
      .from("bookings")
      .select("id")
      .eq("page_id", cur.page_id)
      .eq("status", "confirmed")
      .neq("id", id)
      .lt("starts_at", newEnd)
      .gt("ends_at", newStart.toISOString())
      .maybeSingle()
    if (conflict) {
      return NextResponse.json({ error: "Slot conflicts with another booking" }, { status: 409 })
    }

    const { error } = await service
      .from("bookings")
      .update({
        rescheduled_from_starts_at: cur.starts_at,
        starts_at: newStart.toISOString(),
        ends_at: newEnd,
        status: "confirmed",
      })
      .eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, startsAt: newStart.toISOString(), endsAt: newEnd })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
