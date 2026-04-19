"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  CalendarClock, Clock, Video, Phone, MapPin, MessageCircle,
  CheckCircle2, Loader2, ArrowLeft, ShieldCheck, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MeetingType {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  location_type: "video" | "phone" | "in_person" | "custom"
  location_detail: string | null
  price: number | null
  currency: string | null
}

interface Page {
  id: string
  slug: string
  title: string
  intro: string | null
  timezone: string
}

type Step = "meeting" | "time" | "form" | "confirmed"

const LOCATION_ICON = {
  video: Video,
  phone: Phone,
  in_person: MapPin,
  custom: MessageCircle,
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

export default function BookPage() {
  const params = useParams()
  const slug = (params?.slug as string) ?? ""

  const [step, setStep] = React.useState<Step>("meeting")
  const [meetingTypeId, setMeetingTypeId] = React.useState<string | null>(null)
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().slice(0, 10))
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({ guestName: "", guestEmail: "", guestPhone: "", notes: "" })

  const { data: pageData, isLoading: pageLoading } = useQuery({
    queryKey: ["booking-page", slug],
    queryFn: async (): Promise<{ page: Page; meetingTypes: MeetingType[] }> => {
      const res = await fetch(`/api/book/${slug}`)
      if (!res.ok) throw new Error("Not found")
      return res.json()
    },
  })

  const { data: availability, isLoading: slotsLoading } = useQuery({
    queryKey: ["availability", slug, meetingTypeId, selectedDate],
    queryFn: async (): Promise<string[]> => {
      const res = await fetch(`/api/book/${slug}/availability?date=${selectedDate}&meetingTypeId=${meetingTypeId}`)
      if (!res.ok) return []
      const { slots } = await res.json()
      return slots
    },
    enabled: Boolean(meetingTypeId && selectedDate && step === "time"),
  })

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!meetingTypeId || !selectedSlot) throw new Error("Pick a time")
      const res = await fetch(`/api/book/${slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTypeId, startsAt: selectedSlot,
          guestName: form.guestName, guestEmail: form.guestEmail,
          guestPhone: form.guestPhone || undefined, notes: form.notes || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      return res.json()
    },
    onSuccess: () => setStep("confirmed"),
  })

  const meetingType = pageData?.meetingTypes.find((m) => m.id === meetingTypeId)

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        </div>
      </div>
    )
  }

  if (!pageData) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Surface className="p-10 max-w-md text-center space-y-3">
          <CalendarClock className="h-10 w-10 text-zinc-300 mx-auto" strokeWidth={1.5} />
          <H3 className="text-base">Booking page not found</H3>
          <Muted className="text-sm">This link may have changed or been unpublished.</Muted>
        </Surface>
      </div>
    )
  }

  const { page, meetingTypes } = pageData

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-zinc-900 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <H1 className="text-xl truncate">{page.title}</H1>
            {page.intro && <Muted className="text-sm block truncate">{page.intro}</Muted>}
          </div>
        </div>

        {step !== "meeting" && step !== "confirmed" && (
          <button
            type="button"
            onClick={() => setStep(step === "form" ? "time" : "meeting")}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back
          </button>
        )}

        {step === "meeting" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-xs uppercase tracking-widest font-bold text-zinc-500 px-1">Pick a meeting type</div>
            {meetingTypes.length === 0 ? (
              <Surface className="p-10 text-center">
                <Muted className="text-sm">No meeting types available right now.</Muted>
              </Surface>
            ) : (
              meetingTypes.map((mt) => {
                const Icon = LOCATION_ICON[mt.location_type]
                return (
                  <button
                    key={mt.id}
                    type="button"
                    onClick={() => { setMeetingTypeId(mt.id); setStep("time") }}
                    className="w-full text-left"
                  >
                    <Surface className="p-5 hover:border-zinc-300 transition-colors flex items-center gap-4">
                      <div className="h-10 w-10 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-zinc-700" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <P className="text-sm font-medium">{mt.name}</P>
                        {mt.description && <Muted className="text-xs line-clamp-1">{mt.description}</Muted>}
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                          <Clock className="h-3 w-3" strokeWidth={1.5} />
                          {mt.duration_minutes} min
                          {mt.price ? <> · {new Intl.NumberFormat("en-US", { style: "currency", currency: mt.currency ?? "USD" }).format(mt.price)}</> : null}
                        </div>
                      </div>
                    </Surface>
                  </button>
                )
              })
            )}
          </div>
        )}

        {step === "time" && meetingType && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Surface className="p-5 flex items-center gap-3">
              {(() => { const Icon = LOCATION_ICON[meetingType.location_type]; return <Icon className="h-5 w-5 text-zinc-600" strokeWidth={1.5} /> })()}
              <div className="min-w-0">
                <P className="text-sm font-medium">{meetingType.name}</P>
                <Muted className="text-xs">{meetingType.duration_minutes} min · {page.timezone}</Muted>
              </div>
            </Surface>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-2">Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null) }}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-2">Available times</label>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : availability && availability.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availability.map((iso) => (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => { setSelectedSlot(iso); setStep("form") }}
                        className="h-10 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50 transition-colors"
                      >
                        {formatTime(iso)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Surface className="p-6 text-center">
                    <Muted className="text-sm">No times available on this date. Try another day.</Muted>
                  </Surface>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "form" && meetingType && selectedSlot && (
          <form
            onSubmit={(e) => { e.preventDefault(); createBooking.mutate() }}
            className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <Surface className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-zinc-900 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <P className="text-sm font-medium">{meetingType.name}</P>
                  <Muted className="text-xs">
                    {new Date(selectedSlot).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    {" · "}
                    {formatTime(selectedSlot)} · {meetingType.duration_minutes} min · {page.timezone}
                  </Muted>
                </div>
              </div>
            </Surface>

            <Surface className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <input required type="text" value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
                </Field>
                <Field label="Email">
                  <input required type="email" value={form.guestEmail} onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
                </Field>
              </div>
              <Field label="Phone (optional)">
                <input type="tel" value={form.guestPhone} onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
              </Field>
              <Field label="What would you like to discuss? (optional)">
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
              </Field>
              {createBooking.isError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {createBooking.error instanceof Error ? createBooking.error.message : "Could not book. Try again."}
                </div>
              )}
              <Button type="submit" className="w-full h-10" disabled={createBooking.isPending}>
                {createBooking.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm booking
              </Button>
            </Surface>
          </form>
        )}

        {step === "confirmed" && meetingType && selectedSlot && (
          <Surface className="p-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-14 w-14 rounded-md bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />
            </div>
            <div>
              <H3 className="text-lg">You&apos;re booked</H3>
              <Muted className="text-sm block mt-1">
                {new Date(selectedSlot).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {formatTime(selectedSlot)} ({page.timezone})
              </Muted>
            </div>
            <Muted className="text-xs">A confirmation has been sent to {form.guestEmail}.</Muted>
          </Surface>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  )
}
