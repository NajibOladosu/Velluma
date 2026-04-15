"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, Plus, Download, Search, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import {
  useExpenses,
  useExpenseSummary,
  useApproveExpense,
  useRejectExpense,
  useReimburseExpense,
  formatExpenseCurrency,
  formatExpenseDate,
  type ExpenseRow,
} from "@/lib/queries/expenses"

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

const columns = [
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
          variant={status === "approved" || status === "reimbursed" ? "blue" : "default"}
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExpensesPage() {
  const [search, setSearch] = React.useState("")
  const { data: expenses = [], isLoading } = useExpenses()
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Expense Hub</H1>
          <Muted className="truncate">Track your overhead and prepare for tax season with clinical precision.</Muted>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button variant="outline" className="flex-1 sm:flex-none shrink-0">
            <Download className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button variant="blue" className="flex-1 sm:flex-none shrink-0">
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
          <Surface className="p-6 space-y-4 border-dashed border-2 flex flex-col items-center justify-center min-h-[200px] text-center bg-zinc-50/50 hover:bg-zinc-50 transition-colors cursor-pointer group">
            <div className="h-10 w-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center group-hover:border-zinc-300 transition-colors">
              <Upload className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="space-y-1">
              <P className="text-sm font-medium">Drop receipts here</P>
              <Muted className="text-[10px] uppercase tracking-wider">PDF, PNG, JPG (Max 10MB)</Muted>
            </div>
          </Surface>

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
    </div>
  )
}
