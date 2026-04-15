/**
 * TanStack Query hooks for Time Tracking.
 *
 * Data strategy: `time_entries` is queried directly from the browser.
 * RLS policy: "Freelancers can manage their own time entries" ensures users
 * only see rows where `freelancer_id = auth.uid()`.
 *
 * Timer start/stop routes through the API Gateway because the time-tracking
 * microservice enforces business logic (max one active timer per user, etc).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type  (matches `time_entries` table)
// ---------------------------------------------------------------------------

export interface TimeEntryRow {
  id: string
  contract_id: string
  freelancer_id: string
  task_description: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  hourly_rate: number | null
  status: "draft" | "submitted" | "approved" | "rejected"
  created_at: string
  tenant_id: string | null
}

// ---------------------------------------------------------------------------
// UI-facing type
// ---------------------------------------------------------------------------

export interface TimeEntry {
  id: string
  task: string
  contractId: string
  /** ISO string — null when the timer is still running */
  endTime: string | null
  durationMinutes: number | null
  /** Formatted as "3h 15m" */
  duration: string
  hourlyRate: number
  /** Formatted as "$487.50" */
  total: string
  date: string
  status: TimeEntryRow["status"]
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const timeKeys = {
  all: ["time-entries"] as const,
  lists: () => [...timeKeys.all, "list"] as const,
  running: () => [...timeKeys.all, "running"] as const,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${String(m).padStart(2, "0")}m`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function mapRowToEntry(row: TimeEntryRow): TimeEntry {
  const rate = Number(row.hourly_rate) || 0
  const mins = row.duration_minutes ?? 0
  const totalEarned = (mins / 60) * rate

  return {
    id: row.id,
    task: row.task_description,
    contractId: row.contract_id,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    duration: formatDuration(row.duration_minutes),
    hourlyRate: rate,
    total: rate > 0 ? formatCurrency(totalEarned) : "—",
    date: formatDate(row.created_at),
    status: row.status,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all time entries for the current user. */
export function useTimeEntries() {
  return useQuery({
    queryKey: timeKeys.lists(),
    queryFn: async (): Promise<TimeEntry[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw new Error(error.message)
      return ((data ?? []) as TimeEntryRow[]).map(mapRowToEntry)
    },
  })
}

/** Start a new timer session. */
export interface StartTimerPayload {
  contractId: string
  taskDescription: string
  hourlyRate?: number
}

export function useStartTimer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: StartTimerPayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          contract_id: payload.contractId,
          freelancer_id: user.id,
          tenant_id: user.id,
          task_description: payload.taskDescription,
          start_time: new Date().toISOString(),
          hourly_rate: payload.hourlyRate ?? 0,
          status: "draft",
        })
        .select("*")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToEntry(data as TimeEntryRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}

/** Stop the running timer by entry ID — sets end_time and calculates duration. */
export function useStopTimer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entryId: string) => {
      const supabase = createClient()
      const { data: entry } = await supabase
        .from("time_entries")
        .select("start_time")
        .eq("id", entryId)
        .single()

      const endTime = new Date().toISOString()
      const durationMinutes = entry?.start_time
        ? Math.round((Date.now() - new Date(entry.start_time).getTime()) / 60000)
        : 0

      const { data, error } = await supabase
        .from("time_entries")
        .update({ end_time: endTime, duration_minutes: durationMinutes })
        .eq("id", entryId)
        .select("*")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToEntry(data as TimeEntryRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}

/** Update a time entry's fields directly in Supabase. */
export interface UpdateTimeEntryPayload {
  id: string
  taskDescription?: string
  startTime?: string
  endTime?: string
  durationMinutes?: number
  hourlyRate?: number
  status?: TimeEntryRow["status"]
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      taskDescription,
      startTime,
      endTime,
      durationMinutes,
      hourlyRate,
      status,
    }: UpdateTimeEntryPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("time_entries")
        .update({
          ...(taskDescription !== undefined && { task_description: taskDescription }),
          ...(startTime !== undefined && { start_time: startTime }),
          ...(endTime !== undefined && { end_time: endTime }),
          ...(durationMinutes !== undefined && { duration_minutes: durationMinutes }),
          ...(hourlyRate !== undefined && { hourly_rate: hourlyRate }),
          ...(status !== undefined && { status }),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return mapRowToEntry(data as TimeEntryRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}

/** Delete a time entry. */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}

/** Create a manual time entry. */
export interface CreateTimeEntryPayload {
  contractId: string
  taskDescription: string
  startTime: string
  endTime: string
  durationMinutes: number
  hourlyRate?: number
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTimeEntryPayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          contract_id: payload.contractId,
          freelancer_id: user.id,
          tenant_id: user.id,
          task_description: payload.taskDescription,
          start_time: payload.startTime,
          end_time: payload.endTime,
          duration_minutes: payload.durationMinutes,
          hourly_rate: payload.hourlyRate ?? 0,
          status: "draft",
        })
        .select("*")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToEntry(data as TimeEntryRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}

/** Submit a draft entry for approval. */
export function useSubmitTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("time_entries")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRowToEntry(data as TimeEntryRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}

/** Approve a submitted entry. */
export function useApproveTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from("time_entries")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id ?? null })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRowToEntry(data as TimeEntryRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}

/** Reject a submitted entry. */
export function useRejectTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("time_entries")
        .update({ status: "rejected", freelancer_notes: reason ?? null })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRowToEntry(data as TimeEntryRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeKeys.lists() })
    },
  })
}
