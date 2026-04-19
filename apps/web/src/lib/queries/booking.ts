"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export interface DayAvailability { enabled: boolean; start: string; end: string }

export interface BookingPage {
  id: string
  user_id: string
  slug: string
  title: string
  intro: string | null
  timezone: string
  weekday_availability: DayAvailability[]
  buffer_minutes: number
  notice_hours: number
  is_published: boolean
}

export interface MeetingType {
  id: string
  page_id: string
  name: string
  description: string | null
  duration_minutes: number
  location_type: "video" | "phone" | "in_person" | "custom"
  location_detail: string | null
  price: number | null
  currency: string | null
  is_active: boolean
  order_index: number
}

export interface Booking {
  id: string
  page_id: string
  meeting_type_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string | null
  starts_at: string
  ends_at: string
  notes: string | null
  status: "confirmed" | "cancelled" | "no_show" | "completed"
  created_at: string
}

export const bookingKeys = {
  all: ["booking"] as const,
  page: () => [...bookingKeys.all, "page"] as const,
  meetingTypes: () => [...bookingKeys.all, "meeting-types"] as const,
  upcoming: () => [...bookingKeys.all, "upcoming"] as const,
}

export function useBookingPage() {
  return useQuery({
    queryKey: bookingKeys.page(),
    queryFn: async (): Promise<BookingPage | null> => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("booking_pages")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useUpsertBookingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<BookingPage> & { slug: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data: existing } = await supabase
        .from("booking_pages")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (existing) {
        const { error } = await supabase
          .from("booking_pages")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from("booking_pages")
          .insert({ user_id: user.id, ...patch })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bookingKeys.page() }),
  })
}

export function useMeetingTypes(pageId: string | undefined) {
  return useQuery({
    queryKey: [...bookingKeys.meetingTypes(), pageId],
    queryFn: async (): Promise<MeetingType[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("booking_meeting_types")
        .select("*")
        .eq("page_id", pageId!)
        .order("order_index")
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(pageId),
  })
}

export function useCreateMeetingType(pageId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MeetingType>) => {
      const supabase = createClient()
      const { error } = await supabase.from("booking_meeting_types").insert({
        page_id: pageId,
        name: payload.name ?? "30 minute meeting",
        description: payload.description ?? null,
        duration_minutes: payload.duration_minutes ?? 30,
        location_type: payload.location_type ?? "video",
        location_detail: payload.location_detail ?? null,
        price: payload.price ?? null,
        currency: payload.currency ?? "USD",
        order_index: payload.order_index ?? 0,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bookingKeys.meetingTypes() }),
  })
}

export function useUpdateMeetingType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<MeetingType>) => {
      const supabase = createClient()
      const { error } = await supabase.from("booking_meeting_types").update(patch).eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bookingKeys.meetingTypes() }),
  })
}

export function useDeleteMeetingType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from("booking_meeting_types").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bookingKeys.meetingTypes() }),
  })
}

export function useUpcomingBookings() {
  return useQuery({
    queryKey: bookingKeys.upcoming(),
    queryFn: async (): Promise<Booking[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20)
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}
