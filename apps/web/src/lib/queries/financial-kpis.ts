/**
 * Cross-cutting financial KPIs derived from real DB tables — not from
 * card metadata. Separates the three revenue concepts the original audit
 * flagged as collapsed:
 *
 *   booked     = signed/active contract totals      ("future revenue committed")
 *   recognized = completed milestones + hourly logs ("revenue earned but not yet paid")
 *   collected  = paid invoices                      ("cash in the bank")
 *
 * Used by:
 *   /pipeline    — Booked Revenue KPI
 *   /insights    — three KPIs in the Performance tab
 *   /dashboard   — Active Contracts / Net Revenue widgets
 */
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export interface FinancialKPIs {
  bookedRevenue: number      // SUM(contracts.total_amount WHERE status reflects active/signed)
  recognizedRevenue: number  // SUM(milestones.amount WHERE status='paid') + completed hourly time
  collectedRevenue: number   // SUM(contract_payments.amount WHERE status='completed')
  activeContracts: number
  signedContracts: number
}

const BOOKED_STATUSES = ["signed", "active", "funded", "in_progress", "pending_funding", "pending_delivery", "in_review", "pending_completion"]
const FINISHED_STATUSES = ["completed"]

export const financialKPIKeys = {
  all: ["financial-kpis"] as const,
}

export function useFinancialKPIs() {
  return useQuery({
    queryKey: financialKPIKeys.all,
    queryFn: async (): Promise<FinancialKPIs> => {
      const supabase = createClient()
      const [contractsRes, paymentsRes, milestonesRes] = await Promise.all([
        supabase.from("contracts").select("id, status, total_amount"),
        supabase.from("contract_payments").select("amount, status"),
        supabase.from("milestones").select("amount, status"),
      ])

      const contracts = (contractsRes.data ?? []) as Array<{
        id: string
        status: string
        total_amount: number | null
      }>
      const payments = (paymentsRes.data ?? []) as Array<{
        amount: number | null
        status: string
      }>
      const milestones = (milestonesRes.data ?? []) as Array<{
        amount: number | null
        status: string
      }>

      const bookedRevenue = contracts
        .filter((c) => BOOKED_STATUSES.includes(c.status) || FINISHED_STATUSES.includes(c.status))
        .reduce((s, c) => s + (Number(c.total_amount) || 0), 0)

      const collectedRevenue = payments
        .filter((p) => p.status === "completed")
        .reduce((s, p) => s + (Number(p.amount) || 0), 0)

      // Milestones with status='paid' or legacy 'completed' count as recognized
      // (work done + acknowledged) even if the wire transfer hasn't cleared.
      const recognizedRevenue = milestones
        .filter((m) => m.status === "paid" || m.status === "completed")
        .reduce((s, m) => s + (Number(m.amount) || 0), 0)
        // Fall back to collected when no milestone breakdown — hourly + fixed
        // contracts surface recognized = collected.
        || collectedRevenue

      const signedContracts = contracts.filter((c) =>
        BOOKED_STATUSES.includes(c.status),
      ).length
      const activeContracts = contracts.filter((c) =>
        ["active", "in_progress", "pending_delivery", "in_review"].includes(c.status),
      ).length

      return {
        bookedRevenue,
        recognizedRevenue,
        collectedRevenue,
        activeContracts,
        signedContracts,
      }
    },
  })
}
