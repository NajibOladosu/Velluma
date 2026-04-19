/**
 * GET /api/book/[slug]/availability?date=YYYY-MM-DD&meetingTypeId=...
 * Returns available slot start times for a given date.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

interface DayAvailability { enabled: boolean; start: string; end: string }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const url = new URL(request.url)
  const date = url.searchParams.get("date")
  const meetingTypeId = url.searchParams.get("meetingTypeId")
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD required" }, { status: 400 })
  }
  if (!meetingTypeId) {
    return NextResponse.json({ error: "meetingTypeId required" }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: page } = await supabase
    .from("booking_pages")
    .select("id, weekday_availability, buffer_minutes, notice_hours")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()
  if (!page) return NextResponse.json({ slots: [] })

  const { data: mt } = await supabase
    .from("booking_meeting_types")
    .select("duration_minutes")
    .eq("id", meetingTypeId)
    .eq("page_id", page.id)
    .maybeSingle()
  if (!mt) return NextResponse.json({ slots: [] })

  // Build candidate slots from the day's availability window.
  const dt = new Date(`${date}T00:00:00Z`)
  const weekday = dt.getUTCDay() // 0 = Sunday
  const avail = (page.weekday_availability as DayAvailability[])[weekday]
  if (!avail?.enabled) return NextResponse.json({ slots: [] })

  const [sH, sM] = avail.start.split(":").map(Number)
  const [eH, eM] = avail.end.split(":").map(Number)
  const dayStart = new Date(`${date}T${avail.start}:00`)
  const dayEnd = new Date(`${date}T${avail.end}:00`)
  if (isNaN(dayStart.getTime()) || isNaN(dayEnd.getTime()) || dayEnd <= dayStart) {
    return NextResponse.json({ slots: [] })
  }
  const _ignore = sH + sM + eH + eM // prevent unused warnings

  const noticeMs = (page.notice_hours ?? 0) * 60 * 60_000
  const bufferMs = (page.buffer_minutes ?? 0) * 60_000
  const durMs = mt.duration_minutes * 60_000
  const earliest = new Date(Date.now() + noticeMs)

  // Existing bookings that day for the same page
  const dayStartISO = new Date(`${date}T00:00:00`).toISOString()
  const dayEndISO   = new Date(`${date}T23:59:59`).toISOString()
  const { data: existing } = await supabase
    .from("bookings")
    .select("starts_at, ends_at")
    .eq("page_id", page.id)
    .eq("status", "confirmed")
    .gte("starts_at", dayStartISO)
    .lte("starts_at", dayEndISO)

  const blocks = (existing ?? []).map((b) => ({
    start: new Date(b.starts_at).getTime() - bufferMs,
    end:   new Date(b.ends_at).getTime() + bufferMs,
  }))

  const slots: string[] = []
  // 30-minute step gives a clean grid
  const stepMs = 30 * 60_000
  for (let t = dayStart.getTime(); t + durMs <= dayEnd.getTime(); t += stepMs) {
    const slotStart = t
    const slotEnd = t + durMs
    if (slotStart < earliest.getTime()) continue
    const overlaps = blocks.some((b) => slotStart < b.end && slotEnd > b.start)
    if (overlaps) continue
    slots.push(new Date(slotStart).toISOString())
  }

  return NextResponse.json({ slots })
}
