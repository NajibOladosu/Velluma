"use client"

import * as React from "react"
import {
  Plus, Loader2, X, Repeat, Edit2, Trash2, Pause, Play, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { Badge } from "@/components/ui/badge"
import { H3, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useRecurringInvoices, useUpsertRecurringInvoice,
  useDeleteRecurringInvoice, useToggleRecurringInvoice,
  computeNextRun,
  type RecurringInvoice, type Cadence,
} from "@/lib/queries/recurring-invoices"

const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
}

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
  } catch { return `${currency} ${amount}` }
}

export function RecurringInvoicesPanel() {
  const { data: list = [], isLoading } = useRecurringInvoices()
  const [editing, setEditing] = React.useState<RecurringInvoice | "new" | null>(null)

  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200 flex-wrap">
        <div>
          <H3 className="text-base">Recurring invoices</H3>
          <Muted className="text-xs">Retainers and subscriptions billed automatically on schedule.</Muted>
        </div>
        <Button size="sm" className="h-9 gap-2" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New recurring
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : list.length === 0 ? (
        <div className="p-10 text-center">
          <Repeat className="h-8 w-8 text-zinc-300 mx-auto mb-2" strokeWidth={1.5} />
          <Muted className="text-sm">No recurring invoices. Set up a retainer once, bill forever.</Muted>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {list.map((r) => <RecurringRow key={r.id} recurring={r} onEdit={() => setEditing(r)} />)}
        </div>
      )}

      {editing && <RecurringModal recurring={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Surface>
  )
}

function RecurringRow({ recurring, onEdit }: { recurring: RecurringInvoice; onEdit: () => void }) {
  const del = useDeleteRecurringInvoice()
  const toggle = useToggleRecurringInvoice()
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
          <Repeat className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <P className="text-sm font-medium truncate">{recurring.title}</P>
            <Badge variant={recurring.is_active ? "emerald" : "outline"} className="text-[10px] uppercase tracking-wide">
              {recurring.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
          <Muted className="text-xs truncate block">
            {fmt(Number(recurring.amount), recurring.currency)} · {CADENCE_LABEL[recurring.cadence]}
            {recurring.next_run_at && recurring.is_active && <> · Next: {new Date(recurring.next_run_at).toLocaleDateString()}</>}
            {recurring.client_email && <> · {recurring.client_email}</>}
          </Muted>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="p-1.5 text-zinc-400 hover:text-zinc-900"
          title={recurring.is_active ? "Pause" : "Resume"}
          onClick={() => toggle.mutate({ id: recurring.id, isActive: !recurring.is_active })}
        >
          {recurring.is_active ? <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>
        <button type="button" onClick={onEdit} className="p-1.5 text-zinc-400 hover:text-zinc-900" title="Edit">
          <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="p-1.5 text-zinc-400 hover:text-red-600"
          title="Delete"
          onClick={() => { if (confirm(`Delete "${recurring.title}"?`)) del.mutate(recurring.id) }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function RecurringModal({ recurring, onClose }: { recurring: RecurringInvoice | null; onClose: () => void }) {
  const upsert = useUpsertRecurringInvoice()
  const isEdit = recurring !== null

  const [title, setTitle] = React.useState(recurring?.title ?? "")
  const [description, setDescription] = React.useState(recurring?.description ?? "")
  const [amount, setAmount] = React.useState(recurring?.amount?.toString() ?? "")
  const [currency, setCurrency] = React.useState(recurring?.currency ?? "USD")
  const [cadence, setCadence] = React.useState<Cadence>(recurring?.cadence ?? "monthly")
  const [startsOn, setStartsOn] = React.useState(recurring?.starts_on ?? new Date().toISOString().slice(0, 10))
  const [endsOn, setEndsOn] = React.useState(recurring?.ends_on ?? "")
  const [clientEmail, setClientEmail] = React.useState(recurring?.client_email ?? "")
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError("Amount must be positive"); return }
    try {
      await upsert.mutateAsync({
        id: recurring?.id,
        title: title.trim(),
        description: description.trim() || null,
        amount: amt, currency, cadence,
        startsOn, endsOn: endsOn || null,
        clientEmail: clientEmail.trim() || null,
        isActive: recurring?.is_active ?? true,
      })
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Failed") }
  }

  const previewNext = computeNextRun(startsOn, cadence)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={() => !upsert.isPending && onClose()} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <H3 className="text-base">{isEdit ? "Edit recurring" : "New recurring invoice"}</H3>
            <Muted className="text-xs">Automatically generate invoices on a schedule.</Muted>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title">
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Monthly retainer"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>
          <Field label="Description (optional)">
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Amount">
              <input required type="number" min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
            </Field>
            <Field label="Currency">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
                {["USD","EUR","GBP","CAD","AUD","NGN"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Cadence">
              <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
                {Object.entries(CADENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input required type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
            </Field>
            <Field label="End date (optional)">
              <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
            </Field>
          </div>
          <Field label="Client email (optional)" hint="Receives invoices automatically when scheduled.">
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>

          <div className="rounded-md bg-zinc-50/50 border border-zinc-200 px-3 py-2 text-xs text-zinc-600">
            Next invoice: <span className="font-medium text-zinc-900">{previewNext.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={upsert.isPending}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9" disabled={upsert.isPending || !title.trim() || !amount}>
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {isEdit ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label className="block text-xs font-medium text-zinc-700">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  )
}
