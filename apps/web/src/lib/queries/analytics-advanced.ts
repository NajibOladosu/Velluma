import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export interface CohortBucket {
  cohort: string     // YYYY-MM (first contract month per client)
  clients: number
  activeLater: number
  revenue: number
}

export interface WinRateStats {
  totalLeads: number
  totalProposals: number
  wonProposals: number
  lostProposals: number
  pendingProposals: number
  winRate: number             // 0..1 over won / (won + lost)
  leadToProposalRate: number  // 0..1
  avgWonValue: number
  medianDaysToClose: number
  bySource: { source: string; leads: number; won: number; winRate: number }[]
}

export const advancedKeys = {
  all: ["analytics-advanced"] as const,
  cohorts: () => [...advancedKeys.all, "cohorts"] as const,
  winRate: () => [...advancedKeys.all, "win-rate"] as const,
}

export function useCohorts() {
  return useQuery({
    queryKey: advancedKeys.cohorts(),
    queryFn: async (): Promise<CohortBucket[]> => {
      const supabase = createClient()
      const { data: contracts } = await supabase
        .from("contracts")
        .select("client_id, total_amount, created_at, status")

      if (!contracts || contracts.length === 0) return []

      // First contract per client = cohort month
      const firstByClient = new Map<string, Date>()
      for (const c of contracts) {
        if (!c.client_id) continue
        const d = new Date(c.created_at)
        const existing = firstByClient.get(c.client_id)
        if (!existing || d < existing) firstByClient.set(c.client_id, d)
      }

      const buckets = new Map<string, CohortBucket>()
      for (const c of contracts) {
        if (!c.client_id) continue
        const first = firstByClient.get(c.client_id)!
        const cohortKey = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`
        const bucket = buckets.get(cohortKey) ?? { cohort: cohortKey, clients: 0, activeLater: 0, revenue: 0 }
        bucket.revenue += Number(c.total_amount || 0)
        buckets.set(cohortKey, bucket)
      }

      for (const [clientId, first] of firstByClient.entries()) {
        const key = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`
        const bucket = buckets.get(key)!
        bucket.clients += 1
        const hasLater = contracts.some((c) => c.client_id === clientId && new Date(c.created_at).getTime() > first.getTime() + 1000)
        if (hasLater) bucket.activeLater += 1
      }

      return Array.from(buckets.values()).sort((a, b) => a.cohort.localeCompare(b.cohort))
    },
    staleTime: 60_000,
  })
}

export function useWinRate() {
  return useQuery({
    queryKey: advancedKeys.winRate(),
    queryFn: async (): Promise<WinRateStats> => {
      const supabase = createClient()
      const [{ data: leads }, { data: proposals }] = await Promise.all([
        supabase.from("pipeline_leads").select("id, source, status, client_name, created_at, converted_at"),
        supabase.from("projects").select("id, status, budget, created_at, completed_at, client_id").eq("type", "proposal"),
      ])

      const allProposals = proposals ?? []
      const wonProposals = allProposals.filter((p) => p.status === "accepted" || p.status === "won" || p.status === "completed")
      const lostProposals = allProposals.filter((p) => p.status === "rejected" || p.status === "lost")
      const pendingProposals = allProposals.filter(
        (p) => !["accepted", "won", "completed", "rejected", "lost"].includes(p.status),
      )

      const decisive = wonProposals.length + lostProposals.length
      const winRate = decisive > 0 ? wonProposals.length / decisive : 0

      const allLeads = leads ?? []
      const convertedLeads = allLeads.filter((l) => l.converted_at || l.status === "converted" || l.status === "won")
      const leadToProposalRate = allLeads.length > 0 ? convertedLeads.length / allLeads.length : 0

      const avgWonValue = wonProposals.length > 0
        ? wonProposals.reduce((s, p) => s + Number(p.budget || 0), 0) / wonProposals.length
        : 0

      const daysToClose = wonProposals
        .map((p) => {
          if (!p.completed_at) return null
          const start = new Date(p.created_at).getTime()
          const end = new Date(p.completed_at).getTime()
          return Math.round((end - start) / (1000 * 60 * 60 * 24))
        })
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b)
      const medianDaysToClose = daysToClose.length > 0
        ? daysToClose[Math.floor(daysToClose.length / 2)]
        : 0

      // Source breakdown from leads
      const sourceMap = new Map<string, { leads: number; won: number }>()
      for (const l of allLeads) {
        const src = l.source ?? "unknown"
        const existing = sourceMap.get(src) ?? { leads: 0, won: 0 }
        existing.leads += 1
        if (l.status === "converted" || l.status === "won" || l.converted_at) existing.won += 1
        sourceMap.set(src, existing)
      }
      const bySource = Array.from(sourceMap.entries())
        .map(([source, v]) => ({ source, leads: v.leads, won: v.won, winRate: v.leads > 0 ? v.won / v.leads : 0 }))
        .sort((a, b) => b.leads - a.leads)

      return {
        totalLeads: allLeads.length,
        totalProposals: allProposals.length,
        wonProposals: wonProposals.length,
        lostProposals: lostProposals.length,
        pendingProposals: pendingProposals.length,
        winRate,
        leadToProposalRate,
        avgWonValue,
        medianDaysToClose,
        bySource,
      }
    },
    staleTime: 60_000,
  })
}
