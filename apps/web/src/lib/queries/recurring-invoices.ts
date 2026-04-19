"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export type Cadence = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"

export interface RecurringInvoice {
  id: string
  user_id: string
  client_id: string | null
  client_email: string | null
  title: string
  description: string | null
  amount: number
  currency: string
  cadence: Cadence
  starts_on: string
  ends_on: string | null
  next_run_at: string | null
  last_invoice_at: string | null
  is_active: boolean
  created_at: string
}

export const recurringKeys = {
  all: ["recurring-invoices"] as const,
  list: () => [...recurringKeys.all, "list"] as const,
}

/** Compute the next run date given a starts_on + cadence. */
export function computeNextRun(startsOn: string, cadence: Cadence, from = new Date()): Date {
  const start = new Date(startsOn)
  if (start > from) return start
  const ms = from.getTime()
  const stepDays = cadence === "weekly" ? 7
    : cadence === "biweekly" ? 14
    : cadence === "monthly" ? 30
    : cadence === "quarterly" ? 90
    : 365
  const diff = ms - start.getTime()
  const stepMs = stepDays * 24 * 60 * 60 * 1000
  const steps = Math.ceil(diff / stepMs)
  return new Date(start.getTime() + steps * stepMs)
}

export function useRecurringInvoices() {
  return useQuery({
    queryKey: recurringKeys.list(),
    queryFn: async (): Promise<RecurringInvoice[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("recurring_invoices")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as RecurringInvoice[]
    },
  })
}

export interface RecurringPayload {
  id?: string
  title: string
  description?: string | null
  amount: number
  currency?: string
  cadence: Cadence
  startsOn: string
  endsOn?: string | null
  clientId?: string | null
  clientEmail?: string | null
  isActive?: boolean
}

export function useUpsertRecurringInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: RecurringPayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const nextRun = computeNextRun(p.startsOn, p.cadence).toISOString()
      const payload = {
        title: p.title.trim(),
        description: p.description ?? null,
        amount: p.amount,
        currency: p.currency ?? "USD",
        cadence: p.cadence,
        starts_on: p.startsOn,
        ends_on: p.endsOn ?? null,
        next_run_at: nextRun,
        client_id: p.clientId ?? null,
        client_email: p.clientEmail ?? null,
        is_active: p.isActive ?? true,
        updated_at: new Date().toISOString(),
      }

      if (p.id) {
        const { error } = await supabase.from("recurring_invoices").update(payload).eq("id", p.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from("recurring_invoices").insert({ user_id: user.id, ...payload })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.list() }),
  })
}

export function useToggleRecurringInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const supabase = createClient()
      const { error } = await supabase.from("recurring_invoices").update({ is_active: isActive }).eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.list() }),
  })
}

export function useDeleteRecurringInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from("recurring_invoices").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.list() }),
  })
}
