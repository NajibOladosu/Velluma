"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { CsvImportExport } from "@/components/data/csv-import-export"
import { BulkActionBar } from "@/components/data/bulk-action-bar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, Plus, Search, CheckCircle, XCircle, RefreshCw, Loader2, FileText, X } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import {
  useExpenses,
  useExpenseSummary,
  useApproveExpense,
  useRejectExpense,
  useReimburseExpense,
  useCreateExpense,
  formatExpenseCurrency,
  formatExpenseDate,
  type ExpenseRow,
} from "@/lib/queries/expenses"
import { useProjects } from "@/lib/queries/projects"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Inline action buttons per row
// ---------------------------------------------------------------------------

function ExpenseActions({ expense }: { expense: ExpenseRow }) {
  const approve    = useApproveExpense()
  const reject     = useRejectExpense()
  const reimburse  = useReimburseExpense()
  const isPending  = approve.isPending || reject.isPending || reimburse.isPending

  if (expense.status === "pending") {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          disabled={isPending}
          onClick={() => approve.mutate(expense.id)}
        >
          <CheckCircle className="h-3 w-3" strokeWidth={1.5} />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] gap-1 text-red-600 border-red-200 hover:bg-red-50"
          disabled={isPending}
          onClick={() => reject.mutate({ id: expense.id })}
        >
          <XCircle className="h-3 w-3" strokeWidth={1.5} />
          Reject
        </Button>
      </div>
    )
  }

  if (expense.status === "approved") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px] gap-1"
        disabled={isPending}
        onClick={() => reimburse.mutate(expense.id)}
      >
        <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
        Reimburse
      </Button>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Column defs
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ColCell = { row: any }

function buildColumns(opts: {
  selectedIds: string[]
  toggle: (id: string) => void
  allSelected: boolean
  selectAll: () => void
  clearAll: () => void
}) {
  return [
  {
    id: "select",
    header: () => (
      <input
        type="checkbox"
        checked={opts.allSelected}
        onChange={() => (opts.allSelected ? opts.clearAll() : opts.selectAll())}
        aria-label="Select all"
        className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
      />
    ),
    cell: ({ row }: ColCell) => {
      const id = row.original.id as string
      return (
        <input
          type="checkbox"
          checked={opts.selectedIds.includes(id)}
          onChange={() => opts.toggle(id)}
          aria-label="Select row"
          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
        />
      )
    },
  },
  { accessorKey: "description", header: "Vendor / Description" },
  {
    accessorKey: "expense_date",
    header: "Date",
    cell: ({ row }: ColCell) => <span>{formatExpenseDate(row.getValue("expense_date"))}</span>,
  },
  { accessorKey: "category", header: "Category" },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }: ColCell) => (
      <span className="font-semibold">
        {formatExpenseCurrency(Number(row.getValue("amount")), row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: ColCell) => {
      const status: string = row.getValue("status")
      const label = status.charAt(0).toUpperCase() + status.slice(1)
      const isRejected = status === "rejected"
      return (
        <Badge
          variant={status === "approved" || status === "reimbursed" ? "emerald" : "default"}
          className={isRejected ? "border-red-200 text-red-600" : ""}
        >
          {label}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }: ColCell) => <ExpenseActions expense={row.original as ExpenseRow} />,
  },
  ]
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/* ── Receipt Uploader ─────────────────────────────── */

type UploadState = { kind: "idle" } | { kind: "uploading"; progress: number } | { kind: "done"; url: string; name: string } | { kind: "error"; message: string }

function ReceiptUploader() {
  const [state, setState] = React.useState<UploadState>({ kind: "idle" })
  const inputRef = React.useRef<HTMLInputElement>(null)
  const supabase = React.useMemo(() => createClient(), [])

  async function upload(file: File) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setState({ kind: "error", message: "File exceeds 10 MB limit" }); return }

    setState({ kind: "uploading", progress: 0 })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setState({ kind: "error", message: "Not authenticated" }); return }

    const ext = file.name.split(".").pop()
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`

    const { data, error } = await supabase.storage
      .from("receipts")
      .upload(path, file, { upsert: false, contentType: file.type })

    if (error) { setState({ kind: "error", message: error.message }); return }

    const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(data.path)
    setState({ kind: "done", url: publicUrl, name: file.name })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  return (
    <div
      className="rounded-lg border-2 border-dashed border-zinc-200 p-6 flex flex-col items-center justify-center min-h-[200px] text-center bg-zinc-50/50 hover:bg-zinc-50 transition-colors cursor-pointer group space-y-4"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => state.kind !== "uploading" && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }}
      />

      {state.kind === "idle" && (
        <>
          <div className="h-10 w-10 rounded-md bg-white border border-zinc-200 flex items-center justify-center group-hover:border-zinc-300 transition-colors">
            <Upload className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <P className="text-sm font-medium">Drop receipt here</P>
            <Muted className="text-[10px] uppercase tracking-wider">PDF, PNG, JPG · Max 10 MB</Muted>
          </div>
        </>
      )}

      {state.kind === "uploading" && (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" strokeWidth={1.5} />
          <Muted className="text-xs">Uploading…</Muted>
        </div>
      )}

      {state.kind === "done" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <FileText className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <P className="text-sm font-medium text-emerald-700">Uploaded</P>
            <Muted className="text-[10px] truncate max-w-[160px]">{state.name}</Muted>
          </div>
          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            View receipt
          </a>
          <button
            type="button"
            className="text-[10px] text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1"
            onClick={(e) => { e.stopPropagation(); setState({ kind: "idle" }) }}
          >
            <X className="h-3 w-3" strokeWidth={1.5} /> Upload another
          </button>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex flex-col items-center gap-2">
          <Muted className="text-xs text-red-600">{state.message}</Muted>
          <button
            type="button"
            className="text-[10px] text-zinc-500 underline"
            onClick={(e) => { e.stopPropagation(); setState({ kind: "idle" }) }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

export default function ExpensesPage() {
  const [search, setSearch] = React.useState("")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [addOpen, setAddOpen] = React.useState(false)
  const { data: expenses = [], isLoading, refetch } = useExpenses()
  const { data: summary } = useExpenseSummary()

  const filtered = React.useMemo(() => {
    if (!search.trim()) return expenses
    const q = search.toLowerCase()
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    )
  }, [expenses, search])

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const selectAll = () => setSelectedIds(filtered.map((e) => e.id))
  const clearAll = () => setSelectedIds([])
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  const columns = React.useMemo(
    () => buildColumns({ selectedIds, toggle, allSelected, selectAll, clearAll }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, filtered],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="sm:truncate">Expense Hub</H1>
          <Muted className="sm:truncate">Track your overhead and prepare for tax season with clinical precision.</Muted>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <CsvImportExport resource="expenses" />
          <Button className="flex-1 sm:flex-none shrink-0" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Table */}
        <div className="lg:col-span-3 space-y-4">
          <Surface className="p-0 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-50/30 gap-4 sm:gap-0">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Filter expenses..."
                  className="pl-9 h-9 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <Button variant="outline" size="sm" className="h-8 flex-1 sm:flex-none">Date Range</Button>
                <Button variant="outline" size="sm" className="h-8 flex-1 sm:flex-none">Category</Button>
              </div>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <DataTable columns={columns} data={filtered} />
            )}
          </Surface>
        </div>

        {/* Upload & Summary Sidebar */}
        <div className="space-y-6">
          <ReceiptUploader />

          <Surface className="p-6 space-y-4">
            <H3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Quick Summary</H3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-600 truncate">Total Approved</span>
                {isLoading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <span className="text-sm font-semibold text-zinc-900 shrink-0">
                    {summary?.formattedBilled ?? "$0"}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-600 truncate">Pending Reimbursements</span>
                {isLoading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <span className="text-sm font-semibold text-zinc-900 shrink-0">
                    {summary?.formattedReimbursable ?? "$0"}
                  </span>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-600 truncate">Total Expenses</span>
                <span className="text-sm font-semibold text-zinc-900 shrink-0">
                  {expenses.length} records
                </span>
              </div>
            </div>
          </Surface>
        </div>
      </div>

      <BulkActionBar
        resource="expenses"
        count={selectedIds.length}
        ids={selectedIds}
        onClear={clearAll}
        onDone={() => refetch()}
      />

      <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddExpenseModal — manual expense entry
// ---------------------------------------------------------------------------

const EXPENSE_CATEGORIES = [
  "Software",
  "Subscriptions",
  "Travel",
  "Meals",
  "Equipment",
  "Office Supplies",
  "Marketing",
  "Contractor / Subcontractor",
  "Education",
  "Other",
] as const

function AddExpenseModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: projects = [] } = useProjects()
  const create = useCreateExpense()

  const today = new Date().toISOString().split("T")[0]
  const [projectId, setProjectId]       = React.useState("")
  const [description, setDescription]   = React.useState("")
  const [amount, setAmount]             = React.useState("")
  const [category, setCategory]         = React.useState<string>(EXPENSE_CATEGORIES[0])
  const [expenseDate, setExpenseDate]   = React.useState(today)
  const [notes, setNotes]               = React.useState("")
  const [error, setError]               = React.useState<string | null>(null)

  // Reset form whenever the dialog re-opens
  React.useEffect(() => {
    if (open) {
      setProjectId("")
      setDescription("")
      setAmount("")
      setCategory(EXPENSE_CATEGORIES[0])
      setExpenseDate(today)
      setNotes("")
      setError(null)
    }
    // `today` is stable for the lifetime of a render — no need to track it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseFloat(amount)
    if (!description.trim()) { setError("Description is required"); return }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number")
      return
    }

    try {
      await create.mutateAsync({
        projectId: projectId || null,
        description: description.trim(),
        amount: parsedAmount,
        category,
        expenseDate,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Add expense</DialogTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                Log an expense manually. Project link is optional.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={create.isPending}
              className="text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Description</label>
            <Input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Adobe Creative Cloud — May"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Amount (USD)</label>
              <Input
                required
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Date</label>
              <Input
                required
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Category</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Project <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <option value="">No project (business overhead)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Receipt details, project context, etc."
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Saving…
                </>
              ) : (
                "Save expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
