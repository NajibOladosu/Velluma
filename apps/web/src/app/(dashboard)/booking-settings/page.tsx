"use client"

import * as React from "react"
import {
  Plus, Loader2, X, CalendarClock, Clock, Trash2, Edit2, ExternalLink, Copy, Check,
  Video, Phone, MapPin, MessageCircle, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { Badge } from "@/components/ui/badge"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  useBookingPage, useUpsertBookingPage,
  useMeetingTypes, useCreateMeetingType, useUpdateMeetingType, useDeleteMeetingType,
  useUpcomingBookings,
  type MeetingType, type DayAvailability,
} from "@/lib/queries/booking"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48)
}

export default function BookingSettingsPage() {
  const { data: page, isLoading } = useBookingPage()
  const upsert = useUpsertBookingPage()
  const { data: meetingTypes = [], isLoading: mtLoading } = useMeetingTypes(page?.id)
  const { data: upcoming = [] } = useUpcomingBookings()

  // Local draft — reset when the page loads.
  const [draft, setDraft] = React.useState<{
    slug: string; title: string; intro: string; timezone: string;
    bufferMinutes: number; noticeHours: number;
    availability: DayAvailability[];
  } | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [editing, setEditing] = React.useState<MeetingType | "new" | null>(null)

  React.useEffect(() => {
    if (page && !draft) {
      setDraft({
        slug: page.slug,
        title: page.title,
        intro: page.intro ?? "",
        timezone: page.timezone,
        bufferMinutes: page.buffer_minutes,
        noticeHours: page.notice_hours,
        availability: page.weekday_availability,
      })
    } else if (!page && !isLoading && !draft) {
      setDraft({
        slug: "",
        title: "Book a meeting",
        intro: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
        bufferMinutes: 0,
        noticeHours: 4,
        availability: [
          { enabled: false, start: "09:00", end: "17:00" },
          { enabled: true, start: "09:00", end: "17:00" },
          { enabled: true, start: "09:00", end: "17:00" },
          { enabled: true, start: "09:00", end: "17:00" },
          { enabled: true, start: "09:00", end: "17:00" },
          { enabled: true, start: "09:00", end: "17:00" },
          { enabled: false, start: "09:00", end: "17:00" },
        ],
      })
    }
  }, [page, isLoading, draft])

  async function handleSave() {
    if (!draft) return
    if (!draft.slug.trim()) return
    await upsert.mutateAsync({
      slug: draft.slug,
      title: draft.title,
      intro: draft.intro || null,
      timezone: draft.timezone,
      buffer_minutes: draft.bufferMinutes,
      notice_hours: draft.noticeHours,
      weekday_availability: draft.availability,
      is_published: true,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const publicUrl = draft?.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${draft.slug}` : ""

  function copyUrl() {
    navigator.clipboard.writeText(publicUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <H1 className="text-2xl font-medium">Bookings</H1>
          <Muted className="text-sm">Let clients book meetings with you without the back-and-forth.</Muted>
        </div>
        {page && draft?.slug && (
          <div className="flex items-center gap-2">
            <div className="flex items-center h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-700 font-mono max-w-xs truncate">
              {publicUrl}
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={copyUrl}>
              {copied ? <Check className="h-3.5 w-3.5 mr-2" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" className="h-9" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Preview
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
        {/* Main column */}
        <div className="space-y-8 min-w-0">
          {/* Page settings */}
          <Surface className="p-6 space-y-5">
            <div>
              <H3 className="text-base">Page details</H3>
              <Muted className="text-xs">Shown at the top of your public booking page.</Muted>
            </div>

            {isLoading || !draft ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="URL slug" hint={publicUrl || "your-slug"}>
                  <input
                    type="text" value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                    placeholder="your-name"
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                  />
                </Field>
                <Field label="Page title">
                  <input
                    type="text" value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Intro (optional)">
                    <textarea
                      value={draft.intro} rows={2}
                      onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
                      placeholder="e.g. Let's talk about your project."
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    />
                  </Field>
                </div>
              </div>
            )}
          </Surface>

          {/* Availability */}
          {draft && (
            <Surface className="p-6 space-y-5">
              <div>
                <H3 className="text-base">Availability</H3>
                <Muted className="text-xs">Weekly hours clients can book. All times in your timezone.</Muted>
              </div>

              <div className="space-y-2">
                {draft.availability.map((day, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-zinc-200">
                    <label className="flex items-center gap-2 w-20 cursor-pointer">
                      <input
                        type="checkbox" checked={day.enabled}
                        onChange={(e) => {
                          const next = [...draft.availability]
                          next[i] = { ...day, enabled: e.target.checked }
                          setDraft({ ...draft, availability: next })
                        }}
                        className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                      />
                      <span className={cn("text-xs font-medium", day.enabled ? "text-zinc-900" : "text-zinc-400")}>{DAY_NAMES[i]}</span>
                    </label>

                    {day.enabled ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time" value={day.start}
                          onChange={(e) => {
                            const next = [...draft.availability]
                            next[i] = { ...day, start: e.target.value }
                            setDraft({ ...draft, availability: next })
                          }}
                          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                        />
                        <span className="text-xs text-zinc-400">to</span>
                        <input
                          type="time" value={day.end}
                          onChange={(e) => {
                            const next = [...draft.availability]
                            next[i] = { ...day, end: e.target.value }
                            setDraft({ ...draft, availability: next })
                          }}
                          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                        />
                      </div>
                    ) : (
                      <Muted className="text-xs">Unavailable</Muted>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Minimum notice (hours)">
                  <input
                    type="number" min={0} value={draft.noticeHours}
                    onChange={(e) => setDraft({ ...draft, noticeHours: parseInt(e.target.value) || 0 })}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                  />
                </Field>
                <Field label="Buffer between meetings (min)">
                  <input
                    type="number" min={0} value={draft.bufferMinutes}
                    onChange={(e) => setDraft({ ...draft, bufferMinutes: parseInt(e.target.value) || 0 })}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                {saved && (
                  <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} /> Saved
                  </span>
                )}
                <Button size="sm" className="h-9" onClick={handleSave} disabled={upsert.isPending || !draft.slug.trim()}>
                  {upsert.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Save page
                </Button>
              </div>
            </Surface>
          )}

          {/* Meeting types */}
          {page && (
            <Surface className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <H3 className="text-base">Meeting types</H3>
                  <Muted className="text-xs">Durations and pricing clients choose from.</Muted>
                </div>
                <Button size="sm" className="h-9 gap-2" onClick={() => setEditing("new")}>
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Add type
                </Button>
              </div>

              {mtLoading ? (
                <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : meetingTypes.length === 0 ? (
                <div className="border-2 border-dashed border-zinc-200 rounded-md p-8 text-center">
                  <Muted className="text-sm">No meeting types yet. Add at least one so clients can book.</Muted>
                </div>
              ) : (
                <div className="space-y-2">
                  {meetingTypes.map((mt) => <MeetingTypeRow key={mt.id} mt={mt} onEdit={() => setEditing(mt)} />)}
                </div>
              )}
            </Surface>
          )}
        </div>

        {/* Upcoming sidebar */}
        <div className="space-y-4">
          <H3 className="text-sm uppercase tracking-wider font-semibold">Upcoming</H3>
          {upcoming.length === 0 ? (
            <Surface className="p-6 text-center">
              <CalendarClock className="h-8 w-8 text-zinc-300 mx-auto mb-2" strokeWidth={1.5} />
              <Muted className="text-sm">No upcoming bookings.</Muted>
            </Surface>
          ) : (
            upcoming.map((b) => (
              <Surface key={b.id} className="p-4 space-y-1">
                <P className="text-sm font-medium truncate">{b.guest_name}</P>
                <Muted className="text-xs truncate block">{b.guest_email}</Muted>
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 mt-1">
                  <Clock className="h-3 w-3" strokeWidth={1.5} />
                  {new Date(b.starts_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                </div>
                {b.notes && <Muted className="text-xs line-clamp-2 pt-1">{b.notes}</Muted>}
              </Surface>
            ))
          )}
        </div>
      </div>

      {editing && page && (
        <MeetingTypeModal
          pageId={page.id}
          meetingType={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function MeetingTypeRow({ mt, onEdit }: { mt: MeetingType; onEdit: () => void }) {
  const del = useDeleteMeetingType()
  const Icon = { video: Video, phone: Phone, in_person: MapPin, custom: MessageCircle }[mt.location_type]
  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-md border border-zinc-200 hover:bg-zinc-50/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <P className="text-sm font-medium truncate">{mt.name}</P>
          <Muted className="text-xs truncate">
            {mt.duration_minutes} min
            {mt.price ? ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: mt.currency ?? "USD" }).format(mt.price)}` : ""}
          </Muted>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} className="p-1.5 text-zinc-400 hover:text-zinc-900" title="Edit">
          <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button type="button" onClick={() => { if (confirm(`Delete "${mt.name}"?`)) del.mutate(mt.id) }} className="p-1.5 text-zinc-400 hover:text-red-600" title="Delete">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function MeetingTypeModal({ pageId, meetingType, onClose }: { pageId: string; meetingType: MeetingType | null; onClose: () => void }) {
  const create = useCreateMeetingType(pageId)
  const update = useUpdateMeetingType()
  const isEdit = meetingType !== null

  const [name, setName] = React.useState(meetingType?.name ?? "30 minute meeting")
  const [description, setDescription] = React.useState(meetingType?.description ?? "")
  const [duration, setDuration] = React.useState(meetingType?.duration_minutes ?? 30)
  const [locationType, setLocationType] = React.useState(meetingType?.location_type ?? "video")
  const [locationDetail, setLocationDetail] = React.useState(meetingType?.location_detail ?? "")
  const [price, setPrice] = React.useState(meetingType?.price?.toString() ?? "")
  const [error, setError] = React.useState<string | null>(null)

  const submitting = create.isPending || update.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: duration,
        location_type: locationType,
        location_detail: locationDetail.trim() || null,
        price: price ? parseFloat(price) : null,
      } as Partial<MeetingType>
      if (isEdit && meetingType) await update.mutateAsync({ id: meetingType.id, ...payload })
      else await create.mutateAsync(payload)
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Failed") }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <H3 className="text-base">{isEdit ? "Edit meeting type" : "New meeting type"}</H3>
            <Muted className="text-xs">{isEdit ? "Update offering." : "Define an offering clients can book."}</Muted>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>
          <Field label="Description (optional)">
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (min)">
              <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
                {[15, 20, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Price (optional)">
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
            </Field>
          </div>
          <Field label="Location type">
            <select value={locationType} onChange={(e) => setLocationType(e.target.value as MeetingType["location_type"])}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
              <option value="video">Video call</option>
              <option value="phone">Phone call</option>
              <option value="in_person">In person</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field label="Location detail (optional)" hint="E.g., Zoom link, address, or phone number">
            <input type="text" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9" disabled={submitting || !name.trim()}>
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label className="block text-xs font-medium text-zinc-700">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-500 truncate">{hint}</p>}
    </div>
  )
}
