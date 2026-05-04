"use client"

import * as React from "react"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H2, H3, P, Muted } from "@/components/ui/typography"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  ArrowDownToLine,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { useFinanceStats } from "@/lib/queries/dashboard"
import { usePaymentMethods, RAIL_META } from "@/lib/queries/payment-methods"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function FinancePage() {
  const { data: stats, isLoading } = useFinanceStats()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Escrow & Finance</H1>
          <Muted className="truncate">Your cryptographic vault for secured project funds and payouts.</Muted>
        </div>
        <Button variant="outline" className="h-9">
          <ExternalLink className="mr-2 h-4 w-4" />
          Stripe Dashboard
        </Button>
      </div>

      {/* Onboarding Banner (Stripe Connect) */}
      <Surface className="bg-zinc-900 border-zinc-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 group overflow-hidden relative">
        <div className="flex items-start sm:items-center gap-4 relative z-10 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-md bg-white/10 flex items-center justify-center border border-white/20">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" strokeWidth={1.5} />
          </div>
          <div className="space-y-1 min-w-0">
            <P className="text-white font-medium truncate">Verify your business for Escrow payouts</P>
            <Muted className="text-zinc-400 line-clamp-2 text-xs sm:text-sm">
              Complete your Stripe Connect onboarding to start receiving secured milestone payments.
            </Muted>
          </div>
        </div>
        <Button className="bg-white text-zinc-900 hover:bg-zinc-100 relative z-10 shrink-0 w-full sm:w-auto">
          Complete Onboarding
        </Button>
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
      </Surface>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Surface className="p-6 space-y-2 flex flex-col justify-center">
          <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">In Escrow (Held)</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] truncate leading-none">
              {fmt(stats?.escrowHeld ?? 0)}
            </H2>
          )}
          <P className="text-xs text-zinc-500 line-clamp-2">Secured funds awaiting milestone approval.</P>
        </Surface>

        <Surface className="p-6 space-y-2 flex flex-col justify-center">
          <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Available Balance</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] truncate leading-none">
              {fmt(stats?.availableBalance ?? 0)}
            </H2>
          )}
          <P className="text-xs text-zinc-500 line-clamp-2">Cleared funds ready for transfer.</P>
        </Surface>

        <Surface className="p-6 space-y-2 flex flex-col justify-center">
          <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Active Contract Value</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] truncate leading-none">
              {fmt(stats?.totalProjected ?? 0)}
            </H2>
          )}
          <P className="text-xs text-zinc-500 line-clamp-2">Total value of in-progress contracts.</P>
        </Surface>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Escrow Positions */}
        <div className="lg:col-span-2 space-y-4">
          <H3 className="text-lg font-semibold">Escrow Positions</H3>
          <div className="space-y-3">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <Surface key={i} className="p-4 sm:p-5">
                  <Skeleton className="h-5 w-full" />
                </Surface>
              ))
            ) : (stats?.escrowPositions ?? []).length === 0 ? (
              <Surface className="p-6 text-center">
                <Muted className="text-sm">No escrow positions yet.</Muted>
              </Surface>
            ) : (
              (stats?.escrowPositions ?? []).map((pos) => (
                <Surface
                  key={pos.id}
                  className="p-4 sm:p-5 flex items-center justify-between hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <P className="text-sm font-medium truncate">{pos.contractTitle}</P>
                      <Muted className="text-xs truncate">{pos.description}</Muted>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <div className="flex flex-col items-end text-right min-w-0">
                      <P className="text-sm font-semibold truncate">{fmt(pos.amount)}</P>
                      <Badge
                        variant={pos.status === "released" ? "emerald" : "outline"}
                        className="text-[10px] py-0 px-1.5 h-4 shrink-0 mt-0.5 sm:mt-0 capitalize"
                      >
                        {pos.status}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-300 hidden sm:block shrink-0" />
                  </div>
                </Surface>
              ))
            )}
          </div>
        </div>

        {/* Financial Health Sidebar */}
        <div className="space-y-6">
          <Surface className="p-6 space-y-6">
            <H3 className="text-sm uppercase tracking-wider font-semibold">Financial Velocity</H3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <P className="text-sm font-medium truncate">Pending Release</P>
                  <Muted className="text-xs truncate">
                    {isLoading ? "—" : fmt(stats?.pendingBalance ?? 0)} awaiting release
                  </Muted>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <P className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Wallet Balance</P>
                <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-md border border-zinc-200 gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {isLoading ? "—" : fmt(stats?.availableBalance ?? 0)}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 shrink-0">AVAILABLE</span>
                </div>
              </div>
            </div>
          </Surface>

          <Surface className="p-6 space-y-4 border-dashed flex flex-col min-w-0">
            <CreditCard className="h-5 w-5 text-zinc-400 shrink-0" />
            <div className="space-y-1 min-w-0">
              <P className="text-sm font-medium truncate">Auto-Savings (Velluma Tax)</P>
              <Muted className="text-xs line-clamp-2">
                20% of every payout is automatically stashed for taxes.
              </Muted>
            </div>
            <Button variant="outline" className="w-full h-8 text-xs shrink-0 mt-auto">
              Configure Rules
            </Button>
          </Surface>
        </div>
      </div>

      {/* ── Withdrawals ─────────────────────────────── */}
      <PayoutsSection availableBalance={stats?.availableBalance ?? 0} isLoadingBalance={isLoading} />
    </div>
  )
}

/* ── PayoutsSection ────────────────────────────────── */

function PayoutsSection({ availableBalance, isLoadingBalance }: { availableBalance: number; isLoadingBalance: boolean }) {
  const qc = useQueryClient()
  const supabase = React.useMemo(() => createClient(), [])
  const { data: methods = [], isLoading: methodsLoading } = usePaymentMethods()

  const { data: recentPayouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("id, amount, currency, status, rail, requested_at, completed_at, net_amount")
        .order("requested_at", { ascending: false })
        .limit(10)
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })

  const [selectedMethodId, setSelectedMethodId] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [reqError, setReqError] = React.useState<string | null>(null)

  const requestPayout = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const method = methods.find(m => m.id === selectedMethodId)
      if (!method) throw new Error("Select a withdrawal method")
      const cents = Math.round(parseFloat(amount) * 100)
      if (isNaN(cents) || cents < 100) throw new Error("Minimum payout is $1.00")
      if (cents > availableBalance * 100) throw new Error("Amount exceeds available balance")

      const { error } = await supabase.from("payouts").insert({
        user_id: user.id,
        method_id: selectedMethodId,
        rail: method.rail,
        amount: cents,
        net_amount: cents, // fees deducted async
        currency: method.currency,
        status: "requested",
        description: `Payout via ${RAIL_META[method.rail as keyof typeof RAIL_META]?.displayName ?? method.rail}`,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payouts"] })
      setAmount("")
      setReqError(null)
    },
    onError: (e: Error) => setReqError(e.message),
  })

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge variant="emerald" className="text-[10px] capitalize">{status}</Badge>
    if (status === "failed")    return <Badge variant="red"     className="text-[10px] capitalize">{status}</Badge>
    return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Request payout */}
      <div className="lg:col-span-1 space-y-4">
        <H3 className="text-sm uppercase tracking-wider font-semibold">Request Payout</H3>
        <Surface className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Muted className="text-[10px] uppercase tracking-wider font-bold block">Available balance</Muted>
            <div className="text-2xl font-bold tracking-tight text-zinc-900">
              {isLoadingBalance ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(availableBalance)}
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Withdrawal method</label>
            {methodsLoading ? <Skeleton className="h-10 w-full" /> : (
              <select
                value={selectedMethodId}
                onChange={e => setSelectedMethodId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                <option value="">Select method…</option>
                {methods.map(m => (
                  <option key={m.id} value={m.id}>
                    {RAIL_META[m.rail as keyof typeof RAIL_META]?.icon} {m.label} {m.lastFour ? `····${m.lastFour}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <input
                type="number" min="1" step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white pl-7 pr-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              />
            </div>
          </div>
          {reqError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {reqError}
            </div>
          )}
          <Button
            className="w-full h-9"
            disabled={requestPayout.isPending || !selectedMethodId || !amount || availableBalance <= 0}
            onClick={() => requestPayout.mutate()}
          >
            {requestPayout.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />}
            Request payout
          </Button>
          {methods.length === 0 && !methodsLoading && (
            <P className="text-xs text-zinc-500 text-center">No withdrawal methods yet. <a href="/settings" className="underline">Add one in Settings</a>.</P>
          )}
        </Surface>
      </div>

      {/* Payout history */}
      <div className="lg:col-span-2 space-y-4">
        <H3 className="text-sm uppercase tracking-wider font-semibold">Payout History</H3>
        <Surface>
          {payoutsLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentPayouts.length === 0 ? (
            <div className="p-8 text-center"><Muted className="text-sm">No payouts yet.</Muted></div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recentPayouts.map((p: { id: string; amount: number; net_amount: number; currency: string; status: string; rail: string; requested_at: string }) => (
                <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 text-sm">
                      {RAIL_META[p.rail as keyof typeof RAIL_META]?.icon ?? "💳"}
                    </div>
                    <div className="min-w-0">
                      <P className="text-sm font-medium truncate">{RAIL_META[p.rail as keyof typeof RAIL_META]?.displayName ?? p.rail}</P>
                      <Muted className="text-xs">{new Date(p.requested_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Muted>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-zinc-900">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency ?? "USD" }).format((p.net_amount ?? p.amount) / 100)}
                    </span>
                    {statusBadge(p.status)}
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
