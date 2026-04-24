"use client"

import * as React from "react"
import { Surface } from "@/components/ui/surface"
import { H1, H2, H3, P, Muted } from "@/components/ui/typography"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Target,
  TrendingUp,
  ArrowUpRight,
  Zap,
} from "lucide-react"
import { useAnalyticsStats } from "@/lib/queries/dashboard"
import { useCohorts, useWinRate } from "@/lib/queries/analytics-advanced"

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function fmtRate(minutes: number, earned: number) {
  if (minutes === 0) return "—"
  return `$${Math.round(earned / (minutes / 60))}/hr`
}

function fmtHours(minutes: number) {
  if (minutes === 0) return "—"
  return `${Math.round(minutes / 60)}h`
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ")
}

function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`
}

function CohortAndWinRateSection() {
  const { data: cohorts, isLoading: cohortsLoading } = useCohorts()
  const { data: winRate, isLoading: winLoading } = useWinRate()

  return (
    <div className="space-y-6">
      <Surface className="p-6">
        <H2 className="text-base mb-1">Cohort Retention</H2>
        <Muted className="text-xs mb-5">Clients grouped by the month of their first contract — who came back for more.</Muted>
        {cohortsLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !cohorts || cohorts.length === 0 ? (
          <Muted>Not enough contracts to plot cohorts yet.</Muted>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-100 bg-zinc-50/50">
                  <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-bold text-zinc-500">Cohort</th>
                  <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-bold text-zinc-500">Clients</th>
                  <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-bold text-zinc-500">Repeat</th>
                  <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-bold text-zinc-500">Retention</th>
                  <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-bold text-zinc-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cohorts.map((c) => {
                  const retention = c.clients > 0 ? c.activeLater / c.clients : 0
                  return (
                    <tr key={c.cohort} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-zinc-900">{c.cohort}</td>
                      <td className="px-6 py-3 text-right text-zinc-900">{c.clients}</td>
                      <td className="px-6 py-3 text-right text-zinc-900">{c.activeLater}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={retention >= 0.5 ? "text-emerald-600 font-medium" : "text-zinc-500"}>
                          {fmtPct(retention)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-zinc-900">{fmtCurrency(c.revenue)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface className="p-6 space-y-4">
          <div>
            <H2 className="text-base mb-1">Proposal Win Rate</H2>
            <Muted className="text-xs">How often your proposals convert.</Muted>
          </div>
          {winLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !winRate ? (
            <Muted>No proposals yet.</Muted>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-6">
                <div>
                  <div className="text-3xl font-bold tracking-tight text-zinc-900">{fmtPct(winRate.winRate)}</div>
                  <Muted className="text-xs mt-1">Win rate</Muted>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div>
                  <div className="text-xl font-semibold text-zinc-900">{winRate.wonProposals}</div>
                  <Muted className="text-xs">Won</Muted>
                </div>
                <div>
                  <div className="text-xl font-semibold text-zinc-900">{winRate.lostProposals}</div>
                  <Muted className="text-xs">Lost</Muted>
                </div>
                <div>
                  <div className="text-xl font-semibold text-zinc-500">{winRate.pendingProposals}</div>
                  <Muted className="text-xs">Pending</Muted>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                <div>
                  <Muted className="text-[10px] uppercase tracking-widest">Avg won value</Muted>
                  <div className="text-sm font-semibold text-zinc-900 mt-1">{fmtCurrency(winRate.avgWonValue)}</div>
                </div>
                <div>
                  <Muted className="text-[10px] uppercase tracking-widest">Median days to close</Muted>
                  <div className="text-sm font-semibold text-zinc-900 mt-1">
                    {winRate.medianDaysToClose > 0 ? `${winRate.medianDaysToClose}d` : "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Surface>

        <Surface className="p-6 space-y-4">
          <div>
            <H2 className="text-base mb-1">By Source</H2>
            <Muted className="text-xs">Which channels convert the best.</Muted>
          </div>
          {winLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !winRate || winRate.bySource.length === 0 ? (
            <Muted>No lead source data yet.</Muted>
          ) : (
            <div className="space-y-3">
              {winRate.bySource.map((s) => (
                <div key={s.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-900 capitalize">{s.source}</span>
                    <span className="text-zinc-500">
                      {s.won}/{s.leads} · {fmtPct(s.winRate)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 transition-all"
                      style={{ width: `${Math.round(s.winRate * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useAnalyticsStats()

  const goalTarget = 100_000
  const goalProgress =
    stats && stats.totalRevenue > 0
      ? Math.min(100, Math.round((stats.totalRevenue / goalTarget) * 100))
      : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Profitability Terminal</H1>
          <Muted className="truncate">Real-time margin analysis and project velocity metrics.</Muted>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Gross Margin */}
        <Surface className="p-6 flex flex-col min-w-0 space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Gross Margin</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter truncate max-w-full">
              {stats?.grossMarginPct ?? 0}%
            </H2>
          )}
          <div className="flex items-center gap-1 text-emerald-600 min-w-0">
            <ArrowUpRight className="h-3 w-3 shrink-0" />
            <span className="text-xs font-medium truncate">Revenue minus expenses</span>
          </div>
        </Surface>

        {/* Total Revenue */}
        <Surface className="p-6 flex flex-col min-w-0 space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Total Revenue</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter truncate max-w-full">
              {fmtCurrency(stats?.totalRevenue ?? 0)}
            </H2>
          )}
          <P className="text-xs text-zinc-500 truncate max-w-full">All active contracts combined.</P>
        </Surface>

        {/* Burn Rate */}
        <Surface className="p-6 flex flex-col min-w-0 space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Total Expenses</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter truncate max-w-full">
              {fmtCurrency(stats?.burnRate ?? 0)}
            </H2>
          )}
          <div className="flex items-center gap-1 text-zinc-500 min-w-0">
            <span className="text-xs font-medium truncate">Logged expense total</span>
          </div>
        </Surface>

        {/* Projected (in-progress contracts) */}
        <Surface className="p-6 flex flex-col min-w-0 space-y-2 bg-zinc-900 border-zinc-800">
          <Muted className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 truncate">In-Progress</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-20 bg-zinc-700" />
          ) : (
            <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] text-white font-bold tracking-tighter truncate max-w-full">
              {fmtCurrency(stats?.escrowProjected ?? 0)}
            </H2>
          )}
          <P className="text-xs text-zinc-500 italic truncate max-w-full">Active contract value.</P>
        </Surface>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Performance Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <H3 className="text-lg font-semibold">Contract Performance</H3>
          <Surface className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Contract</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Value</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Logged</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Eff. Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="px-4 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="px-4 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : (stats?.contracts ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-zinc-400 text-sm">
                        No contract data yet.
                      </td>
                    </tr>
                  ) : (
                    (stats?.contracts ?? []).map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-4 font-medium text-zinc-900 max-w-[200px]">
                          <div className="truncate">{row.title}</div>
                          <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                            {statusLabel(row.status)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-zinc-600">
                          {fmtCurrency(row.total_amount)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Badge variant="default" className="bg-zinc-100 text-zinc-900 border-zinc-200">
                            {fmtHours(row.totalMinutes)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-zinc-900">
                          {fmtRate(row.totalMinutes, row.totalEarned)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Surface>
        </div>

        {/* Insights Sidebar */}
        <div className="space-y-6">
          <Surface className="p-6 space-y-6">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="h-4 w-4 text-zinc-700 flex-shrink-0" strokeWidth={1.5} />
              <H3 className="text-sm uppercase tracking-wider font-semibold truncate">Insights</H3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <P className="text-xs font-bold text-zinc-900 truncate">Active Contracts</P>
                <P className="text-xs text-zinc-500 leading-relaxed">
                  {isLoading
                    ? "Loading..."
                    : `${(stats?.contracts ?? []).filter((c) => c.status === "in_progress").length} contract(s) currently in progress.`}
                </P>
              </div>
              <Separator />
              <div className="space-y-1">
                <P className="text-xs font-bold text-zinc-900 truncate">Expense Overhead</P>
                <P className="text-xs text-zinc-500 leading-relaxed">
                  {isLoading
                    ? "Loading..."
                    : stats && stats.totalRevenue > 0
                    ? `${(100 - stats.grossMarginPct).toFixed(1)}% of revenue goes to expenses.`
                    : "No expense data recorded yet."}
                </P>
              </div>
            </div>
          </Surface>

          <Surface className="bg-zinc-900 border-zinc-800 p-6 space-y-2 text-white">
            <Target className="h-5 w-5 mb-2 text-white" strokeWidth={1.5} />
            <P className="font-semibold text-sm truncate text-white">Goal: $100K Revenue</P>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="bg-white h-full transition-all" style={{ width: `${goalProgress}%` }} />
            </div>
            {isLoading ? (
              <Skeleton className="h-3 w-40 bg-white/20 mt-2" />
            ) : (
              <Muted className="text-zinc-400 text-[10px] block pt-2 truncate">
                {goalProgress}% of your $100K annual target reached.
              </Muted>
            )}
          </Surface>
        </div>
      </div>

      <CohortAndWinRateSection />
    </div>
  )
}
