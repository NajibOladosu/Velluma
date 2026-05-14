"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Plus,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { H1, H2, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ProjectDetail } from "@/lib/queries/projects"
import { useTimeEntries, type TimeEntry } from "@/lib/queries/time"
import { useExpenses, type ExpenseRow } from "@/lib/queries/expenses"

// ───────────────────────── Formatting helpers ─────────────────────────────────

function fmtCurrency(amount: number, currency = "USD") {
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

function fmtHours(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0 && m === 0) return "0h"
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const STATUS_VARIANT: Record<string, "default" | "emerald" | "outline"> = {
  active:    "default",
  completed: "emerald",
  "on-hold": "outline",
}

// ─────────────────────────── Header ──────────────────────────────────────────

export function ProjectHubHeader({
  detail,
  isLoading,
  taskCount,
  tasksDone,
  onAddTask,
  onEdit,
  onArchiveToggle,
  onDelete,
}: {
  detail: ProjectDetail | null
  isLoading: boolean
  taskCount: number
  tasksDone: number
  onAddTask: () => void
  onEdit?: () => void
  onArchiveToggle?: () => void
  onDelete?: () => void
}) {
  if (isLoading || !detail) {
    return (
      <Surface className="p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-3 w-96" />
      </Surface>
    )
  }

  return (
    <div className="space-y-3">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        All projects
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Project</Muted>
          <div className="flex items-center gap-2 flex-wrap">
            <H1 className="text-2xl font-semibold tracking-tight min-w-0">{detail.title}</H1>
            <Badge
              variant={STATUS_VARIANT[detail.status] ?? "outline"}
              className="capitalize shrink-0"
            >
              {detail.status}
            </Badge>
            {detail.pricingMode && (
              <Badge variant="outline" className="capitalize shrink-0">
                {detail.pricingMode}
              </Badge>
            )}
          </div>

          {/* Linked entities row */}
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-zinc-500">
            {detail.client.name && (
              <LinkChip
                href={detail.client.id ? `/clients/${detail.client.id}` : undefined}
                icon={<Users className="h-3 w-3" strokeWidth={1.5} />}
                label={detail.client.name}
              />
            )}
            {detail.primaryContract && (
              <LinkChip
                href={`/contracts/${detail.primaryContract.id}`}
                icon={<ShieldCheck className="h-3 w-3" strokeWidth={1.5} />}
                label={detail.primaryContract.number ?? "Contract"}
              />
            )}
            {detail.proposalId && (
              <LinkChip
                href={`/proposals/${detail.proposalId}`}
                icon={<FileText className="h-3 w-3" strokeWidth={1.5} />}
                label="Proposal"
              />
            )}
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <CalendarClock className="h-3 w-3" strokeWidth={1.5} />
              Started {fmtDate(detail.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-700 font-medium">
              <DollarSign className="h-3 w-3" strokeWidth={1.5} />
              {fmtCurrency(detail.totalBudget, detail.currency)}
            </span>
          </div>

          {detail.description && (
            <P className="text-sm text-zinc-600 leading-relaxed max-w-3xl line-clamp-2">
              {detail.description}
            </P>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick task progress */}
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500 pr-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>
              {tasksDone}/{taskCount} done
            </span>
          </div>
          <Button size="sm" className="h-9 gap-2" onClick={onAddTask}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add Task
          </Button>
          {(onEdit || onArchiveToggle || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Project actions" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit} className="text-xs gap-2">
                    <Pencil className="h-3.5 w-3.5 text-zinc-500" /> Edit details
                  </DropdownMenuItem>
                )}
                {onArchiveToggle && (
                  <DropdownMenuItem onClick={onArchiveToggle} className="text-xs gap-2">
                    <Archive className="h-3.5 w-3.5 text-zinc-500" />
                    {detail.rawStatus === "completed" ? "Reopen" : "Mark completed"}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-xs gap-2 text-red-600">
                    <Trash2 className="h-3.5 w-3.5" /> Delete project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}

function LinkChip({
  href,
  icon,
  label,
}: {
  href?: string
  icon: React.ReactNode
  label: string
}) {
  const inner = (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 transition-colors">
      {icon}
      <span className="truncate max-w-[160px]">{label}</span>
    </span>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

// ─────────────────────────── KPI row ─────────────────────────────────────────

export function ProjectKpiRow({
  detail,
  isLoading,
}: {
  detail: ProjectDetail | null
  isLoading: boolean
}) {
  if (isLoading || !detail) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Surface key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </Surface>
        ))}
      </div>
    )
  }

  const cost = detail.timeRevenue + detail.expensesTotal
  const budgetPct =
    detail.totalBudget > 0 ? Math.min(100, Math.round((cost / detail.totalBudget) * 100)) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={<Wallet className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />}
        label="Budget"
        primary={fmtCurrency(detail.totalBudget, detail.currency)}
        sub={
          cost > 0
            ? `${fmtCurrency(cost, detail.currency)} burned · ${budgetPct}%`
            : "Untracked"
        }
      />
      <KpiCard
        icon={<Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />}
        label="Hours logged"
        primary={fmtHours(detail.hoursLogged)}
        sub={
          detail.hoursBillable > 0
            ? `${fmtHours(detail.hoursBillable)} billable · ${fmtCurrency(detail.timeRevenue, detail.currency)}`
            : "No billable rate"
        }
      />
      <KpiCard
        icon={<Receipt className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />}
        label="Invoiced"
        primary={fmtCurrency(detail.invoicedAmount, detail.currency)}
        sub={
          detail.paidAmount > 0
            ? `${fmtCurrency(detail.paidAmount, detail.currency)} paid`
            : "Nothing paid yet"
        }
      />
      <KpiCard
        icon={<ShieldCheck className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />}
        label="Escrow held"
        primary={fmtCurrency(detail.escrowHeld, detail.currency)}
        sub={detail.escrowHeld > 0 ? "Funded" : "—"}
      />
    </div>
  )
}

function KpiCard({
  icon,
  label,
  primary,
  sub,
}: {
  icon: React.ReactNode
  label: string
  primary: string
  sub?: string
}) {
  return (
    <Surface className="p-4">
      <div className="flex items-center justify-between pb-1.5">
        <Muted className="text-[10px] uppercase tracking-widest font-bold">{label}</Muted>
        {icon}
      </div>
      <div className="text-lg font-bold tracking-tight text-zinc-900 truncate">{primary}</div>
      {sub && <Muted className="text-[11px] truncate">{sub}</Muted>}
    </Surface>
  )
}

// ─────────────────────────── Time section ────────────────────────────────────

export function ProjectTimeSection({ projectId }: { projectId: string }) {
  const { data: entries = [], isLoading } = useTimeEntries()
  const projectEntries = React.useMemo(
    () => entries.filter((e) => (e as TimeEntry).projectId === projectId),
    [entries, projectId],
  )

  return (
    <Surface className="overflow-hidden">
      <SectionHeader
        icon={<Clock className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />}
        title="Time entries"
        href="/time"
        subtitle={
          projectEntries.length > 0
            ? `${projectEntries.length} on this project`
            : "Nothing logged yet"
        }
      />
      {isLoading ? (
        <div className="p-5 space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : projectEntries.length === 0 ? (
        <div className="p-5 text-center">
          <Muted className="text-sm">
            No time entries on this project. Start the timer to log work here.
          </Muted>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50/50 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                <th className="px-5 py-3">Task</th>
                <th className="px-5 py-3 text-right">Duration</th>
                <th className="px-5 py-3 text-right hidden sm:table-cell">Rate</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 hidden sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {projectEntries.slice(0, 6).map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 truncate max-w-[260px]">
                    <div className="text-zinc-900 truncate">{e.task}</div>
                    <Muted className="text-[10px]">{e.date}</Muted>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-700">{e.duration}</td>
                  <td className="px-5 py-3 text-right text-zinc-500 hidden sm:table-cell">
                    {e.hourlyRate > 0 ? `$${e.hourlyRate}/h` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-zinc-900">{e.total}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {e.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projectEntries.length > 6 && (
            <div className="px-5 py-3 border-t border-zinc-100 text-right">
              <Link
                href="/time"
                className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
              >
                View all {projectEntries.length} entries <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </Surface>
  )
}

// ─────────────────────────── Expenses section ────────────────────────────────

export function ProjectExpensesSection({ projectId }: { projectId: string }) {
  const { data: expenses = [], isLoading } = useExpenses()
  const projectExpenses = React.useMemo(
    () => expenses.filter((e) => (e as ExpenseRow).project_id === projectId),
    [expenses, projectId],
  )
  const total = projectExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  return (
    <Surface className="overflow-hidden">
      <SectionHeader
        icon={<Receipt className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />}
        title="Expenses"
        href="/expenses"
        subtitle={
          projectExpenses.length > 0
            ? `${projectExpenses.length} · ${fmtCurrency(total)}`
            : "Nothing logged"
        }
      />
      {isLoading ? (
        <div className="p-5 space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : projectExpenses.length === 0 ? (
        <div className="p-5 text-center">
          <Muted className="text-sm">
            No expenses on this project. Add one from the Expenses page.
          </Muted>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50/50 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3 hidden sm:table-cell">Category</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 hidden sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {projectExpenses.slice(0, 6).map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3">
                    <div className="text-zinc-900 truncate max-w-[260px]">{e.description}</div>
                    <Muted className="text-[10px]">{fmtDate(e.expense_date)}</Muted>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 hidden sm:table-cell">{e.category}</td>
                  <td className="px-5 py-3 text-right font-semibold text-zinc-900">
                    {fmtCurrency(Number(e.amount) || 0, e.currency ?? "USD")}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {e.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projectExpenses.length > 6 && (
            <div className="px-5 py-3 border-t border-zinc-100 text-right">
              <Link
                href="/expenses"
                className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
              >
                View all {projectExpenses.length} expenses <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </Surface>
  )
}

// ─────────────────────────── Messages summary ────────────────────────────────

/**
 * Project Messages panel — surfaces the project's client thread without
 * duplicating the full Messages page. Shows last few messages + a CTA to
 * jump to the client thread.
 */
export function ProjectMessagesSection({
  projectId,
  clientId,
}: {
  projectId: string
  clientId: string | null
}) {
  void projectId
  const { data: thread, isLoading } = useProjectThreadPreview(clientId)

  return (
    <Surface className="p-0 overflow-hidden">
      <SectionHeader
        icon={<FileText className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />}
        title="Messages"
        right={
          clientId ? (
            <Link
              href={`/messages`}
              className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              Open inbox <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null
        }
      />
      {!clientId ? (
        <div className="p-6 text-center">
          <Muted className="text-sm">Attach a client to enable messages on this project.</Muted>
        </div>
      ) : isLoading ? (
        <div className="p-4 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (thread?.messages.length ?? 0) === 0 ? (
        <div className="p-6 text-center">
          <Muted className="text-sm">No messages yet. Send the first one from the inbox.</Muted>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {thread!.messages.slice(0, 4).map((m) => (
            <div key={m.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-900 truncate">
                  {m.sender_name ?? m.sender_role ?? "Unknown"}
                </span>
                <Muted className="text-[10px] shrink-0">
                  {fmtDate(m.created_at)}
                </Muted>
              </div>
              <P className="text-xs text-zinc-600 line-clamp-2 mt-0.5">{m.message}</P>
            </div>
          ))}
        </div>
      )}
    </Surface>
  )
}

// ─────────────────────────── Shared section header ───────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
  right,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  href?: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <H2 className="text-base">{title}</H2>
        {subtitle && (
          <Muted className="text-xs ml-1 truncate">· {subtitle}</Muted>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
        >
          Open <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
      {right}
    </div>
  )
}

// Re-export so the page can import names from one place.
export { useProjectDetail } from "@/lib/queries/projects"

// Used by the page header — surfaced here so future detail-section tests
// can import the same icon vocabulary.
export { TrendingUp }

// ─────────────────────────── Thread preview hook ────────────────────────────

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

interface ThreadMessage {
  id: string
  message: string
  sender_role: string | null
  sender_name: string | null
  created_at: string
}

function useProjectThreadPreview(clientId: string | null) {
  return useQuery({
    queryKey: ["project-thread-preview", clientId],
    queryFn: async (): Promise<{ messages: ThreadMessage[] }> => {
      if (!clientId) return { messages: [] }
      const supabase = createClient()
      const { data: convo } = await supabase
        .from("contract_conversations")
        .select("id")
        .eq("client_id", clientId)
        .is("project_id", null)
        .maybeSingle<{ id: string }>()
      if (!convo) return { messages: [] }
      const { data } = await supabase
        .from("contract_messages")
        .select("id, message, sender_role, sender_name, created_at")
        .eq("conversation_id", convo.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(6)
      return { messages: ((data ?? []) as ThreadMessage[]).reverse() }
    },
    enabled: Boolean(clientId),
  })
}
