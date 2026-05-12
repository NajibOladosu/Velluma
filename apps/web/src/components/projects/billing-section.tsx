"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  Send,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useProjectMilestones,
  useGenerateMilestoneInvoice,
  useCreateMilestone,
  type Milestone,
  type MilestoneStatus,
} from "@/lib/queries/milestones"
import { useCreateInvoice } from "@/lib/queries/invoices"

/**
 * Billing section that lands at the top of the project detail page.
 *
 * Reads the project's contract(s), pulls milestones, and exposes the
 * payment-structure-aware "Generate invoice" action:
 *
 *   - fixed    → one Generate Invoice button for the contract balance
 *   - hourly   → "Generate from time entries" CTA (not yet implemented —
 *                 currently shows a hint about manual generation)
 *   - milestone → per-milestone Generate Invoice button. When all
 *                 milestones are paid, the contract is fully invoiced.
 *   - retainer → recurring schedule (uses recurring_invoices table — not
 *                 in this section yet)
 */

interface ProjectContract {
  id: string
  title: string
  status: string
  payment_type: "fixed" | "milestone" | "hourly" | "retainer"
  total_amount: number | null
  currency: string
  contract_number: string | null
}

interface ProjectInvoice {
  id: string
  invoice_number: string | null
  amount: number
  currency: string
  status: string
  sent_at: string | null
  completed_at: string | null
  due_date: string | null
}

function fmtCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(0)}`
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const STATUS_BADGE_VARIANT: Record<MilestoneStatus, "default" | "emerald" | "outline"> = {
  upcoming:    "outline",
  ready:       "default",
  invoiced:    "default",
  paid:        "emerald",
  pending:     "outline",
  in_progress: "default",
  completed:   "emerald",
  disputed:    "outline",
}

function statusIcon(status: MilestoneStatus) {
  if (status === "paid" || status === "completed")
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
  if (status === "invoiced" || status === "in_progress" || status === "ready")
    return <Clock className="h-4 w-4 text-zinc-500 shrink-0" strokeWidth={1.5} />
  return <Circle className="h-4 w-4 text-zinc-300 shrink-0" strokeWidth={1.5} />
}

export function ProjectBillingSection({ projectId }: { projectId: string }) {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const qc = useQueryClient()

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["project-billing-contracts", projectId],
    queryFn: async (): Promise<ProjectContract[]> => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, title, status, payment_type, total_amount, currency, contract_number")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as ProjectContract[]
    },
  })

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["project-billing-invoices", projectId],
    queryFn: async (): Promise<ProjectInvoice[]> => {
      const { data, error } = await supabase
        .from("contract_payments")
        .select("id, invoice_number, amount, currency, status, sent_at, completed_at, due_date")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as ProjectInvoice[]
    },
  })

  const milestonesQuery = useProjectMilestones(projectId)
  const milestones = milestonesQuery.data ?? []
  const isLoading = contractsLoading || invoicesLoading || milestonesQuery.isLoading

  const generateMilestoneInvoice = useGenerateMilestoneInvoice()
  const createInvoice = useCreateInvoice()
  const createMilestone = useCreateMilestone()

  const primary = contracts?.[0]

  async function generateFixedInvoice() {
    if (!primary) return
    const result = await createInvoice.mutateAsync({
      projectId,
      contractId: primary.id,
      amount: Number(primary.total_amount) || 0,
      currency: primary.currency,
      paymentType: "escrow",
      lineItems: [
        {
          description: primary.title,
          qty: 1,
          unit_price: Number(primary.total_amount) || 0,
          total: Number(primary.total_amount) || 0,
        },
      ],
    })
    qc.invalidateQueries({ queryKey: ["project-billing-invoices", projectId] })
    router.push(`/invoices/${result.id}`)
  }

  async function generateForMilestone(m: Milestone) {
    const result = await generateMilestoneInvoice.mutateAsync({
      milestoneId: m.id,
      contractId: m.contractId,
    })
    qc.invalidateQueries({ queryKey: ["project-billing-invoices", projectId] })
    router.push(`/invoices/${result.invoiceId}`)
  }

  // ── No contract on the project yet ──────────────────────────────────────
  if (!contractsLoading && (contracts?.length ?? 0) === 0) {
    return (
      <Surface className="p-6 space-y-2">
        <div className="flex items-center gap-2 text-zinc-900">
          <Receipt className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
          <P className="text-sm font-semibold">Billing</P>
        </div>
        <Muted className="text-sm">
          No contract yet. Generate one from the project&apos;s proposal to enable invoicing.
        </Muted>
      </Surface>
    )
  }

  if (isLoading) {
    return (
      <Surface className="p-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </Surface>
    )
  }

  return (
    <Surface className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Billing</Muted>
          <div className="flex items-center gap-2 mt-0.5">
            <P className="text-sm font-semibold text-zinc-900 truncate">
              {primary?.title}
            </P>
            <Badge variant="outline" className="capitalize">
              {primary?.payment_type ?? "fixed"}
            </Badge>
          </div>
          <Muted className="text-xs mt-0.5">
            {primary?.contract_number ?? "Draft"}
            {primary?.total_amount
              ? ` · ${fmtCurrency(Number(primary.total_amount), primary.currency)}`
              : ""}
          </Muted>
        </div>

        {/* Generate-invoice action varies by payment_type */}
        {primary && primary.payment_type === "fixed" && (
          <Button
            onClick={generateFixedInvoice}
            disabled={createInvoice.isPending}
            className="gap-2 shrink-0"
          >
            {createInvoice.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" strokeWidth={1.5} />
            )}
            Generate invoice
          </Button>
        )}
        {primary && primary.payment_type === "hourly" && (
          <Muted className="text-xs text-zinc-500 max-w-[260px] text-right">
            Hourly billing: invoice generation from approved time entries is
            coming. Use New Invoice manually for now.
          </Muted>
        )}
      </div>

      {/* Milestones list (only when payment_type === 'milestone') */}
      {primary?.payment_type === "milestone" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Milestones
            </h3>
            {primary && (
              <AddMilestoneInline
                contractId={primary.id}
                onCreate={(payload) =>
                  createMilestone.mutateAsync({ ...payload, contractId: primary.id })
                }
                pending={createMilestone.isPending}
              />
            )}
          </div>

          {milestones.length === 0 ? (
            <Surface className="p-5 text-center">
              <Muted className="text-sm">No milestones yet. Add one to start invoicing.</Muted>
            </Surface>
          ) : (
            <div className="space-y-2">
              {milestones.map((m) => {
                const alreadyInvoiced = Boolean(m.invoiceId)
                const isPaid = m.status === "paid" || m.status === "completed"
                return (
                  <Surface
                    key={m.id}
                    className="p-4 flex items-start justify-between gap-3 flex-wrap"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {statusIcon(m.status)}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">
                          {m.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {m.dueDate && (
                            <Muted className="text-xs">Due {fmtDate(m.dueDate)}</Muted>
                          )}
                          <Badge variant={STATUS_BADGE_VARIANT[m.status]} className="text-[10px] uppercase tracking-wide capitalize">
                            {m.status}
                          </Badge>
                          <span className="text-xs font-medium text-zinc-700 flex items-center gap-0.5">
                            <DollarSign className="h-3 w-3" strokeWidth={1.5} />
                            {m.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {alreadyInvoiced ? (
                      <Link
                        href={`/invoices/${m.invoiceId}`}
                        className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 shrink-0"
                      >
                        View invoice <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : isPaid ? null : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs shrink-0 gap-1.5"
                        disabled={generateMilestoneInvoice.isPending}
                        onClick={() => generateForMilestone(m)}
                      >
                        {generateMilestoneInvoice.isPending &&
                        generateMilestoneInvoice.variables?.milestoneId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" strokeWidth={1.5} />
                        )}
                        Generate invoice
                      </Button>
                    )}
                  </Surface>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Invoices list */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Invoices
        </h3>
        {(invoices?.length ?? 0) === 0 ? (
          <Surface className="p-5 text-center">
            <Muted className="text-sm">No invoices yet for this project.</Muted>
          </Surface>
        ) : (
          <div className="space-y-2">
            {(invoices ?? []).map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="block"
              >
                <Surface className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors group">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {inv.invoice_number ?? "Draft invoice"}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <Muted className="text-xs capitalize">{inv.status}</Muted>
                      {inv.due_date && (
                        <Muted className="text-xs">· Due {fmtDate(inv.due_date)}</Muted>
                      )}
                      {inv.sent_at && (
                        <Muted className="text-xs">· Sent {fmtDate(inv.sent_at)}</Muted>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-zinc-900">
                      {fmtCurrency(Number(inv.amount) || 0, inv.currency)}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Surface>
  )
}

// ---------------------------------------------------------------------------
// Inline "Add milestone" — collapses into a button when closed
// ---------------------------------------------------------------------------

function AddMilestoneInline({
  contractId,
  onCreate,
  pending,
}: {
  contractId: string
  onCreate: (payload: {
    title: string
    amount: number
    dueDate?: string | null
    description?: string
  }) => Promise<unknown>
  pending: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")

  void contractId

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> Add milestone
      </Button>
    )
  }

  async function submit() {
    const amt = parseFloat(amount)
    if (!title.trim() || !Number.isFinite(amt) || amt < 0) return
    await onCreate({
      title: title.trim(),
      amount: amt,
      dueDate: dueDate || null,
    })
    setOpen(false)
    setTitle("")
    setAmount("")
    setDueDate("")
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        autoFocus
        type="text"
        placeholder="Milestone name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-7 px-2 text-xs rounded border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <input
        type="number"
        placeholder="Amount"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-7 px-2 text-xs rounded border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 w-24"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="h-7 px-2 text-xs rounded border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </div>
  )
}
