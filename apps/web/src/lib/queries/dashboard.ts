/**
 * TanStack Query hooks for the Dashboard and analytics pages.
 *
 * Queries contracts, time_entries, expenses, notifications, wallet_balances,
 * and escrow_ledger directly. RLS ensures users only see their own rows.
 */
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardStats {
  // Ledger
  completedRevenue: number        // sum of completed contract amounts
  escrowHeld: number              // escrow_ledger rows with status='held'
  pendingBalance: number          // wallet_balances.pending
  availableBalance: number        // wallet_balances.available
  effectiveHourlyRate: number     // total time-entry earnings / total hours

  // Counts
  unreadNotifications: number
  activeContractsCount: number

  // Lists
  activeContracts: { id: string; title: string; status: string; client_id: string | null }[]
  recentNotifications: {
    id: string
    title: string
    message: string
    is_read: boolean
    created_at: string
  }[]
  escrowPositions: {
    id: string
    description: string
    amount: number
    status: string
    contract_id: string | null
  }[]
}

export interface ContractPerformanceRow {
  id: string
  title: string
  total_amount: number
  status: string
  totalMinutes: number
  totalEarned: number
}

export interface ExpenseCategoryRow {
  category: string
  total: number
  count: number
}

export interface ProfitabilityStats {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  expensesByCategory: ExpenseCategoryRow[]
  contractRates: ContractPerformanceRow[]
}

export interface AnalyticsStats {
  grossMarginPct: number
  burnRate: number           // total expenses
  totalRevenue: number
  escrowProjected: number    // in-progress contract values
  contracts: ContractPerformanceRow[]
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  analytics: () => [...dashboardKeys.all, "analytics"] as const,
  profitability: () => [...dashboardKeys.all, "profitability"] as const,
  finance: () => [...dashboardKeys.all, "finance"] as const,
}

// ---------------------------------------------------------------------------
// useDashboardStats
// ---------------------------------------------------------------------------

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const supabase = createClient()

      const [
        { data: contracts },
        { data: timeEntries },
        { data: notifications },
        { data: walletRows },
        { data: escrowRows },
      ] = await Promise.all([
        supabase.from("contracts").select("id,title,status,total_amount,client_id,payment_status"),
        supabase.from("time_entries").select("duration_minutes,hourly_rate"),
        supabase
          .from("notifications")
          .select("id,title,message,is_read,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("wallet_balances").select("available,pending").limit(1).maybeSingle(),
        supabase
          .from("escrow_ledger")
          .select("id,description,amount,status,contract_id")
          .order("created_at", { ascending: false }),
      ])

      // Revenue: sum of completed contracts
      const completedRevenue = (contracts ?? [])
        .filter((c) => c.status === "completed")
        .reduce((s, c) => s + Number(c.total_amount || 0), 0)

      // Escrow held
      const escrowHeld = (escrowRows ?? [])
        .filter((e) => e.status === "held")
        .reduce((s, e) => s + Number(e.amount || 0), 0)

      // Effective hourly rate
      let totalMinutes = 0
      let totalEarned = 0
      for (const te of timeEntries ?? []) {
        const mins = Number(te.duration_minutes || 0)
        const rate = Number(te.hourly_rate || 0)
        totalMinutes += mins
        totalEarned += (mins / 60) * rate
      }
      const effectiveHourlyRate =
        totalMinutes > 0 ? Math.round(totalEarned / (totalMinutes / 60)) : 0

      const unreadNotifications = (notifications ?? []).filter((n) => !n.is_read).length

      const activeContracts = (contracts ?? []).filter(
        (c) => c.status === "in_progress" || c.status === "funded",
      )

      return {
        completedRevenue,
        escrowHeld,
        pendingBalance: Number(walletRows?.pending || 0),
        availableBalance: Number(walletRows?.available || 0),
        effectiveHourlyRate,
        unreadNotifications,
        activeContractsCount: activeContracts.length,
        activeContracts: activeContracts.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          client_id: c.client_id,
        })),
        recentNotifications: (notifications ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          is_read: n.is_read,
          created_at: n.created_at,
        })),
        escrowPositions: (escrowRows ?? []).map((e) => ({
          id: e.id,
          description: e.description ?? "",
          amount: Number(e.amount),
          status: e.status,
          contract_id: e.contract_id,
        })),
      }
    },
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// useFinanceStats
// ---------------------------------------------------------------------------

export interface FinanceStats {
  availableBalance: number
  pendingBalance: number
  escrowHeld: number
  totalProjected: number
  escrowPositions: {
    id: string
    description: string
    amount: number
    status: string
    contract_id: string | null
    contractTitle: string
  }[]
}

export function useFinanceStats() {
  return useQuery({
    queryKey: dashboardKeys.finance(),
    queryFn: async (): Promise<FinanceStats> => {
      const supabase = createClient()

      const [
        { data: walletRows },
        { data: escrowRows },
        { data: contracts },
      ] = await Promise.all([
        supabase.from("wallet_balances").select("available,pending").limit(1).maybeSingle(),
        supabase
          .from("escrow_ledger")
          .select("id,description,amount,status,contract_id")
          .order("created_at", { ascending: false }),
        supabase.from("contracts").select("id,title,status,total_amount"),
      ])

      const contractMap = new Map<string, string>(
        (contracts ?? []).map((c) => [c.id, c.title]),
      )

      const escrowHeld = (escrowRows ?? [])
        .filter((e) => e.status === "held")
        .reduce((s, e) => s + Number(e.amount || 0), 0)

      const inProgressTotal = (contracts ?? [])
        .filter((c) => c.status === "in_progress" || c.status === "funded")
        .reduce((s, c) => s + Number(c.total_amount || 0), 0)

      return {
        availableBalance: Number(walletRows?.available || 0),
        pendingBalance: Number(walletRows?.pending || 0),
        escrowHeld,
        totalProjected: inProgressTotal,
        escrowPositions: (escrowRows ?? []).map((e) => ({
          id: e.id,
          description: e.description ?? "",
          amount: Number(e.amount),
          status: e.status,
          contract_id: e.contract_id,
          contractTitle: e.contract_id ? (contractMap.get(e.contract_id) ?? "Contract") : "—",
        })),
      }
    },
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// useAnalyticsStats
// ---------------------------------------------------------------------------

export function useAnalyticsStats() {
  return useQuery({
    queryKey: dashboardKeys.analytics(),
    queryFn: async (): Promise<AnalyticsStats> => {
      const supabase = createClient()

      const [
        { data: contracts },
        { data: timeEntries },
        { data: expenses },
      ] = await Promise.all([
        supabase.from("contracts").select("id,title,status,total_amount,currency"),
        supabase.from("time_entries").select("contract_id,duration_minutes,hourly_rate"),
        supabase.from("expenses").select("amount"),
      ])

      // Group time entries by contract
      const timeByContract = new Map<string, { minutes: number; earned: number }>()
      for (const te of timeEntries ?? []) {
        const mins = Number(te.duration_minutes || 0)
        const rate = Number(te.hourly_rate || 0)
        const existing = timeByContract.get(te.contract_id) ?? { minutes: 0, earned: 0 }
        timeByContract.set(te.contract_id, {
          minutes: existing.minutes + mins,
          earned: existing.earned + (mins / 60) * rate,
        })
      }

      const totalRevenue = (contracts ?? [])
        .filter((c) => c.status !== "cancelled")
        .reduce((s, c) => s + Number(c.total_amount || 0), 0)

      const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount || 0), 0)

      const grossMarginPct =
        totalRevenue > 0
          ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100)
          : 0

      const escrowProjected = (contracts ?? [])
        .filter((c) => c.status === "in_progress" || c.status === "funded")
        .reduce((s, c) => s + Number(c.total_amount || 0), 0)

      const contractRows: ContractPerformanceRow[] = (contracts ?? [])
        .filter((c) => c.status !== "cancelled" && Number(c.total_amount || 0) > 0)
        .map((c) => {
          const te = timeByContract.get(c.id) ?? { minutes: 0, earned: 0 }
          return {
            id: c.id,
            title: c.title,
            total_amount: Number(c.total_amount || 0),
            status: c.status,
            totalMinutes: te.minutes,
            totalEarned: te.earned,
          }
        })
        .sort((a, b) => b.total_amount - a.total_amount)

      return {
        grossMarginPct,
        burnRate: totalExpenses,
        totalRevenue,
        escrowProjected,
        contracts: contractRows,
      }
    },
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// useProfitabilityStats
// ---------------------------------------------------------------------------

export function useProfitabilityStats() {
  return useQuery({
    queryKey: dashboardKeys.profitability(),
    queryFn: async (): Promise<ProfitabilityStats> => {
      const supabase = createClient()

      const [
        { data: contracts },
        { data: timeEntries },
        { data: expenses },
      ] = await Promise.all([
        supabase.from("contracts").select("id,title,status,total_amount"),
        supabase.from("time_entries").select("contract_id,duration_minutes,hourly_rate"),
        supabase.from("expenses").select("amount,category,status"),
      ])

      const totalRevenue = (contracts ?? [])
        .filter((c) => c.status === "completed")
        .reduce((s, c) => s + Number(c.total_amount || 0), 0)

      const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount || 0), 0)
      const netIncome = totalRevenue - totalExpenses

      // Group expenses by category
      const catMap = new Map<string, { total: number; count: number }>()
      for (const e of expenses ?? []) {
        const cat = e.category ?? "Other"
        const existing = catMap.get(cat) ?? { total: 0, count: 0 }
        catMap.set(cat, { total: existing.total + Number(e.amount), count: existing.count + 1 })
      }
      const expensesByCategory: ExpenseCategoryRow[] = Array.from(catMap.entries())
        .map(([category, v]) => ({ category, total: v.total, count: v.count }))
        .sort((a, b) => b.total - a.total)

      // Group time entries by contract for hourly rate analysis
      const timeByContract = new Map<string, { minutes: number; earned: number }>()
      for (const te of timeEntries ?? []) {
        const mins = Number(te.duration_minutes || 0)
        const rate = Number(te.hourly_rate || 0)
        const existing = timeByContract.get(te.contract_id) ?? { minutes: 0, earned: 0 }
        timeByContract.set(te.contract_id, {
          minutes: existing.minutes + mins,
          earned: existing.earned + (mins / 60) * rate,
        })
      }

      const contractRates: ContractPerformanceRow[] = (contracts ?? [])
        .filter((c) => timeByContract.has(c.id))
        .map((c) => {
          const te = timeByContract.get(c.id)!
          return {
            id: c.id,
            title: c.title,
            total_amount: Number(c.total_amount || 0),
            status: c.status,
            totalMinutes: te.minutes,
            totalEarned: te.earned,
          }
        })
        .sort((a, b) => b.totalMinutes - a.totalMinutes)

      return { totalRevenue, totalExpenses, netIncome, expensesByCategory, contractRates }
    },
    staleTime: 60_000,
  })
}
