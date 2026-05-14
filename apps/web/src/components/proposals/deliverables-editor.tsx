"use client"

import * as React from "react"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  useProposalDeliverables,
  useCreateProposalDeliverable,
  useUpdateProposalDeliverable,
  useDeleteProposalDeliverable,
  type ProposalDeliverable,
} from "@/lib/queries/proposal-deliverables"
import { useServices, type Service } from "@/lib/queries/services"

/**
 * Structured Scope editor (§1 Proposal-as-origin).
 *
 * Replaces the free-text Scope editor with rows of:
 *   title · description · qty · unit_price · est_hours
 * Drop-from-services prefills a row from the rate-card catalog.
 *
 * Sum row drives the auto-computed Pricing total. On proposal acceptance,
 * each row becomes both a contract clause line AND a kanban task.
 */

function fmtCurrency(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `$${n.toLocaleString()}`
  }
}

export function DeliverablesEditor({
  proposalId,
  currency = "USD",
}: {
  proposalId: string
  currency?: string
}) {
  const { data: deliverables = [], isLoading } = useProposalDeliverables(proposalId)
  const { data: services = [] } = useServices()
  const create = useCreateProposalDeliverable()
  const remove = useDeleteProposalDeliverable()

  const total = deliverables.reduce((s, d) => s + d.lineTotal, 0)
  const totalHours = deliverables.reduce((s, d) => s + d.estHours, 0)

  // Service picker UI state
  const [pickerOpen, setPickerOpen] = React.useState(false)

  async function addBlankRow() {
    await create.mutateAsync({
      proposalId,
      title: "New deliverable",
      qty: 1,
      unitPrice: 0,
      position: deliverables.length,
    })
  }

  async function addFromService(svc: Service) {
    await create.mutateAsync({
      proposalId,
      title: svc.name,
      description: svc.description ?? undefined,
      serviceId: svc.id,
      qty: 1,
      unitPrice: svc.price,
      position: deliverables.length,
    })
    setPickerOpen(false)
  }

  return (
    <Surface className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <P className="text-sm font-semibold text-zinc-900">Deliverables</P>
          <Muted className="text-xs">
            Each row becomes a contract clause and a project task on acceptance.
          </Muted>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setPickerOpen((o) => !o)}
            disabled={services.length === 0}
            title={services.length === 0 ? "Add services to your library first" : undefined}
          >
            <Plus className="h-3 w-3" /> From services
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={addBlankRow}
            disabled={create.isPending}
          >
            {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add row
          </Button>
        </div>
      </div>

      {pickerOpen && (
        <div className="p-3 border-b border-zinc-200 bg-zinc-50/50 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">
              Pick a service
            </Muted>
            <button
              type="button"
              aria-label="Close picker"
              onClick={() => setPickerOpen(false)}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {services.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => addFromService(svc)}
                className="text-left p-3 rounded-md border border-zinc-200 bg-white hover:border-zinc-900 transition-colors"
              >
                <div className="text-sm font-medium text-zinc-900 truncate">{svc.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <Muted className="text-[10px] uppercase tracking-widest">
                    {svc.category ?? "—"}
                  </Muted>
                  <span className="text-xs font-semibold text-zinc-900">
                    {fmtCurrency(svc.price, svc.currency)}
                    {svc.unit && svc.unit !== "flat" ? `/${svc.unit}` : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rows */}
      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : deliverables.length === 0 ? (
        <div className="p-8 text-center">
          <Muted className="text-sm">
            No deliverables yet. Add your first row to start pricing.
          </Muted>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {deliverables.map((d) => (
            <DeliverableRow key={d.id} deliverable={d} currency={currency} onDelete={(id) => remove.mutate({ id, proposalId })} deletePending={remove.isPending} />
          ))}
        </div>
      )}

      {/* Sum row */}
      {deliverables.length > 0 && (
        <div className="px-5 py-4 border-t border-zinc-200 bg-zinc-50/30 flex items-center justify-between gap-3 flex-wrap">
          <Muted className="text-xs">
            {deliverables.length} {deliverables.length === 1 ? "deliverable" : "deliverables"}
            {totalHours > 0 ? ` · ${totalHours.toLocaleString()} est. hours` : ""}
          </Muted>
          <div className="text-sm">
            <span className="text-zinc-500">Total: </span>
            <span className="font-bold text-zinc-900">{fmtCurrency(total, currency)}</span>
          </div>
        </div>
      )}
    </Surface>
  )
}

// ---------------------------------------------------------------------------
// DeliverableRow — inline-edit row with debounced save
// ---------------------------------------------------------------------------

function DeliverableRow({
  deliverable,
  currency,
  onDelete,
  deletePending,
}: {
  deliverable: ProposalDeliverable
  currency: string
  onDelete: (id: string) => void
  deletePending: boolean
}) {
  const update = useUpdateProposalDeliverable()
  const [title, setTitle] = React.useState(deliverable.title)
  const [description, setDescription] = React.useState(deliverable.description ?? "")
  const [qty, setQty] = React.useState(String(deliverable.qty))
  const [unitPrice, setUnitPrice] = React.useState(String(deliverable.unitPrice))
  const [estHours, setEstHours] = React.useState(String(deliverable.estHours))

  // Sync local state if the row gets refetched (e.g. after sibling create)
  React.useEffect(() => {
    setTitle(deliverable.title)
    setDescription(deliverable.description ?? "")
    setQty(String(deliverable.qty))
    setUnitPrice(String(deliverable.unitPrice))
    setEstHours(String(deliverable.estHours))
  }, [deliverable])

  // Save on blur — keeps writes batched per field, no round-trip per keystroke.
  function commit(patch: Parameters<typeof update.mutate>[0]) {
    update.mutate(patch)
  }

  const lineTotal = (Number(qty) || 0) * (Number(unitPrice) || 0)

  return (
    <div className="p-4 grid grid-cols-12 gap-2 items-start">
      <div className="col-span-12 md:col-span-6 space-y-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== deliverable.title && commit({ id: deliverable.id, proposalId: deliverable.proposalId, title })}
          placeholder="Deliverable title"
          className="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm font-medium text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (deliverable.description ?? "") && commit({ id: deliverable.id, proposalId: deliverable.proposalId, description })}
          placeholder="Optional description"
          rows={1}
          className="flex w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 resize-y"
        />
      </div>

      <RowField label="Qty" className="col-span-3 md:col-span-1">
        <input
          type="number"
          min="0"
          step="0.5"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => Number(qty) !== deliverable.qty && commit({ id: deliverable.id, proposalId: deliverable.proposalId, qty: Number(qty) || 0 })}
          className="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        />
      </RowField>

      <RowField label="Rate" className="col-span-4 md:col-span-2">
        <input
          type="number"
          min="0"
          step="1"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={() => Number(unitPrice) !== deliverable.unitPrice && commit({ id: deliverable.id, proposalId: deliverable.proposalId, unitPrice: Number(unitPrice) || 0 })}
          className="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        />
      </RowField>

      <RowField label="Hours" className="col-span-3 md:col-span-1">
        <input
          type="number"
          min="0"
          step="0.5"
          value={estHours}
          onChange={(e) => setEstHours(e.target.value)}
          onBlur={() => Number(estHours) !== deliverable.estHours && commit({ id: deliverable.id, proposalId: deliverable.proposalId, estHours: Number(estHours) || 0 })}
          className="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        />
      </RowField>

      <div className={cn("col-span-2 md:col-span-2 flex flex-col items-end justify-start pt-5")}>
        <span className="text-sm font-semibold text-zinc-900">
          {fmtCurrency(lineTotal, currency)}
        </span>
        <button
          type="button"
          aria-label="Delete deliverable"
          onClick={() => onDelete(deliverable.id)}
          disabled={deletePending}
          className="text-zinc-400 hover:text-red-600 transition-colors mt-1 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function RowField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-[9px] uppercase tracking-widest font-bold text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  )
}
