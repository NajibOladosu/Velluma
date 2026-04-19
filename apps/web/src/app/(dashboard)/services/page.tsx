"use client"

import * as React from "react"
import {
  Plus, Loader2, X, Briefcase, Edit2, Trash2, Tag, AlertCircle, Search,
} from "lucide-react"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  useServices, useCreateService, useUpdateService, useDeleteService,
  type Service, type ServiceUnit,
} from "@/lib/queries/services"

const UNIT_LABEL: Record<ServiceUnit, string> = {
  flat: "Flat fee",
  hour: "per hour",
  day: "per day",
  word: "per word",
  project: "per project",
  recurring: "monthly",
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "NGN"]

function fmt(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price)
  } catch { return `${currency} ${price}` }
}

export default function ServicesPage() {
  const { data: services = [], isLoading } = useServices()
  const [editing, setEditing] = React.useState<Service | "new" | null>(null)
  const [search, setSearch] = React.useState("")

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <H1 className="text-2xl font-medium">Services & Rate Cards</H1>
          <Muted className="text-sm">Reusable offerings you can drop into proposals and invoices in one click.</Muted>
        </div>
        <Button size="sm" className="h-9 gap-2 shrink-0" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New service
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services…"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-44 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Surface className="p-16 text-center">
          <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-6 w-6 text-zinc-400" strokeWidth={1.5} />
          </div>
          <P className="font-medium text-zinc-900">{search ? "No services match your search" : "No services yet"}</P>
          <Muted className="text-sm mt-1">{search ? "Try a different term" : "Add your first service to start saving time on proposals."}</Muted>
          {!search && (
            <Button size="sm" className="h-9 gap-2 mt-4" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Add your first service
            </Button>
          )}
        </Surface>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} onEdit={() => setEditing(service)} />
          ))}
        </div>
      )}

      {editing && <ServiceModal service={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ServiceCard({ service, onEdit }: { service: Service; onEdit: () => void }) {
  const deleteService = useDeleteService()
  const updateService = useUpdateService()

  return (
    <Surface className={cn("p-5 flex flex-col gap-3 group transition-colors", !service.isActive && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <P className="text-sm font-medium truncate">{service.name}</P>
          {service.category && (
            <Muted className="text-xs flex items-center gap-1 mt-0.5">
              <Tag className="h-3 w-3" strokeWidth={1.5} /> {service.category}
            </Muted>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button type="button" onClick={onEdit} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors" title="Edit">
            <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => { if (confirm(`Delete "${service.name}"?`)) deleteService.mutate(service.id) }}
            className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
            title="Delete"
            disabled={deleteService.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {service.description && (
        <Muted className="text-xs line-clamp-2 leading-relaxed">{service.description}</Muted>
      )}

      <div className="mt-auto flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-semibold text-zinc-900 tracking-tight">{fmt(service.price, service.currency)}</div>
          <Muted className="text-[10px] uppercase tracking-widest">{UNIT_LABEL[service.unit]}</Muted>
        </div>
        <Badge
          variant={service.isActive ? "emerald" : "outline"}
          className="text-[10px] uppercase tracking-wide cursor-pointer"
          onClick={() => updateService.mutate({ id: service.id, isActive: !service.isActive })}
        >
          {service.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </Surface>
  )
}

function ServiceModal({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const create = useCreateService()
  const update = useUpdateService()
  const isEdit = service !== null

  const [name, setName] = React.useState(service?.name ?? "")
  const [description, setDescription] = React.useState(service?.description ?? "")
  const [category, setCategory] = React.useState(service?.category ?? "")
  const [price, setPrice] = React.useState(service?.price?.toString() ?? "")
  const [currency, setCurrency] = React.useState(service?.currency ?? "USD")
  const [unit, setUnit] = React.useState<ServiceUnit>(service?.unit ?? "flat")
  const [error, setError] = React.useState<string | null>(null)

  const submitting = create.isPending || update.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const numPrice = parseFloat(price)
    if (isNaN(numPrice) || numPrice < 0) { setError("Price must be a positive number"); return }
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        price: numPrice, currency, unit,
      }
      if (isEdit && service) {
        await update.mutateAsync({ id: service.id, ...payload })
      } else {
        await create.mutateAsync(payload)
      }
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save") }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <H3 className="text-base">{isEdit ? "Edit service" : "New service"}</H3>
            <Muted className="text-xs">{isEdit ? "Update offering details." : "A reusable offering for proposals and invoices."}</Muted>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Service name">
            <input
              required type="text"
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brand identity package"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What's included…"
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 resize-y"
            />
          </Field>

          <Field label="Category (optional)">
            <input
              type="text"
              value={category} onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Design, Development, Strategy"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Price" className="col-span-1">
              <input
                required type="number" min="0" step="0.01"
                value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              />
            </Field>
            <Field label="Currency" className="col-span-1">
              <select
                value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Unit" className="col-span-1">
              <select
                value={unit} onChange={(e) => setUnit(e.target.value as ServiceUnit)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                <option value="flat">Flat fee</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="word">Word</option>
                <option value="project">Project</option>
                <option value="recurring">Recurring (monthly)</option>
              </select>
            </Field>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9" disabled={submitting || !name.trim() || !price}>
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {isEdit ? "Save changes" : "Create service"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5 min-w-0", className)}>
      <label className="block text-xs font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  )
}
