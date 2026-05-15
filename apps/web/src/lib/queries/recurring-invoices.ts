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

// ─────────────────────────────────────────────────────────────────────────────
// §3 Retainer schedule — contract/project-scoped helpers wired to the
// `advance_recurring_invoice` SECURITY DEFINER fn (see migration
// 20260515000000_retainer_recurring_invoices.sql).
// ─────────────────────────────────────────────────────────────────────────────

export interface RecurringInvoiceWithLinks extends RecurringInvoice {
  contract_id: string | null
  project_id: string | null
}

export const recurringByEntityKeys = {
  byContract: (id: string) => [...recurringKeys.all, "contract", id] as const,
  byProject:  (id: string) => [...recurringKeys.all, "project", id] as const,
}

export function useRecurringByContract(contractId: string) {
  return useQuery({
    queryKey: recurringByEntityKeys.byContract(contractId),
    queryFn: async (): Promise<RecurringInvoiceWithLinks[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("recurring_invoices")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as RecurringInvoiceWithLinks[]
    },
    enabled: Boolean(contractId),
  })
}

export function useRecurringByProject(projectId: string) {
  return useQuery({
    queryKey: recurringByEntityKeys.byProject(projectId),
    queryFn: async (): Promise<RecurringInvoiceWithLinks[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("recurring_invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as RecurringInvoiceWithLinks[]
    },
    enabled: Boolean(projectId),
  })
}

/** Run the next billing cycle right now via the SECURITY DEFINER RPC. */
export function useAdvanceRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId?: string; contractId?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc("advance_recurring_invoice", { p_id: id })
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: recurringKeys.all })
      if (vars.projectId)
        qc.invalidateQueries({ queryKey: recurringByEntityKeys.byProject(vars.projectId) })
      if (vars.contractId)
        qc.invalidateQueries({ queryKey: recurringByEntityKeys.byContract(vars.contractId) })
      qc.invalidateQueries({ queryKey: ["invoices"] })
      qc.invalidateQueries({ queryKey: ["project-billing-invoices"] })
    },
  })
}

/** Pause / resume / skip-next on a schedule. */
export interface UpdateRecurringPayload {
  id: string
  isActive?: boolean
  skipNext?: boolean
  cadence?: Cadence
  amount?: number
  endsOn?: string | null
}

export function useUpdateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: UpdateRecurringPayload) => {
      const supabase = createClient()
      const patch: Record<string, unknown> = {}
      if (p.isActive !== undefined) patch.is_active = p.isActive
      if (p.cadence !== undefined)  patch.cadence = p.cadence
      if (p.amount !== undefined)   patch.amount = p.amount
      if (p.endsOn !== undefined)   patch.ends_on = p.endsOn

      if (p.skipNext) {
        const { data: cur } = await supabase
          .from("recurring_invoices")
          .select("next_run_at, cadence")
          .eq("id", p.id)
          .single<{ next_run_at: string | null; cadence: Cadence }>()
        const base = cur?.next_run_at ? new Date(cur.next_run_at) : new Date()
        const days = cur?.cadence === "weekly" ? 7
          : cur?.cadence === "biweekly" ? 14
          : cur?.cadence === "monthly" ? 30
          : cur?.cadence === "quarterly" ? 90
          : cur?.cadence === "yearly" ? 365 : 30
        patch.next_run_at = new Date(base.getTime() + days * 86_400_000).toISOString()
      }

      const { error } = await supabase
        .from("recurring_invoices")
        .update(patch)
        .eq("id", p.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recurringKeys.all })
    },
  })
}
