"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { CheckCircle2, Loader2, ShieldCheck, AlertCircle, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"

interface Booking {
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

export default function CancelBookingPage() {
  const params = useParams()
  const token = (params?.token as string) ?? ""

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cancel-booking", token],
    queryFn: async (): Promise<{ booking: Booking } | null> => {
      const res = await fetch(`/api/book/cancel/${token}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const [reason, setReason] = React.useState("")
  const cancel = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/book/cancel/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      return res.json()
    },
    onSuccess: () => refetch(),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (!data?.booking) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Surface className="p-10 max-w-md text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-zinc-300 mx-auto" strokeWidth={1.5} />
          <H3 className="text-base">Booking not found</H3>
          <Muted className="text-sm">This cancellation link is invalid or expired.</Muted>
        </Surface>
      </div>
    )
  }

  const b = data.booking
  const isCancelled = b.status === "cancelled"
  const when = new Date(b.starts_at).toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  })

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-zinc-900 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <H1 className="text-xl">{b.page?.title ?? "Cancel booking"}</H1>
        </div>

        {isCancelled ? (
          <Surface className="p-10 text-center space-y-4">
            <div className="h-12 w-12 rounded-md bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" strokeWidth={1.5} />
            </div>
            <div>
              <H3 className="text-lg">This booking is cancelled</H3>
              <Muted className="text-sm block mt-1">
                {b.meeting_type?.name ?? "Meeting"} · originally {when}
              </Muted>
            </div>
            {b.cancelled_at && (
              <Muted className="text-xs">
                Cancelled {new Date(b.cancelled_at).toLocaleString()}.
              </Muted>
            )}
          </Surface>
        ) : (
          <Surface className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="h-5 w-5 text-zinc-500 mt-0.5" strokeWidth={1.5} />
              <div className="min-w-0">
                <P className="text-sm font-medium">{b.meeting_type?.name ?? "Meeting"}</P>
                <Muted className="text-xs">{when}</Muted>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Reason for cancelling <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Something came up, want to reschedule, etc."
                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 resize-y"
              />
            </div>
            {cancel.isError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                {cancel.error instanceof Error ? cancel.error.message : "Cancel failed"}
              </div>
            )}
            <Button
              type="button"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="w-full bg-red-600 hover:bg-red-700 gap-2"
            >
              {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel booking
            </Button>
            <Muted className="text-xs text-center">
              Need to reschedule instead? Book a new time at <code className="font-mono">/{b.page?.slug}</code>.
            </Muted>
          </Surface>
        )}
      </div>
    </div>
  )
}
