/**
 * TanStack Query hooks for Expenses.
 *
 * Data strategy: `expenses` table is queried directly. RLS policy
 * "Users can manage own expenses" enforces `user_id = auth.uid()`.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type  (matches `expenses` table)
// ---------------------------------------------------------------------------

export interface ExpenseRow {
  id: string
  project_id: string
  tenant_id: string
  user_id: string | null
  description: string
  amount: number
  currency: string
  category: string
  expense_date: string
  receipt_url: string | null
  notes: string | null
  status: "pending" | "approved" | "rejected" | "reimbursed"
  created_at: string
}

// ---------------------------------------------------------------------------
// Insert payload
// ---------------------------------------------------------------------------

export interface CreateExpensePayload {
  projectId: string
  description: string
  amount: number
  currency?: string
  category: string
  expenseDate: string
  receiptUrl?: string
  notes?: string
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const expenseKeys = {
  all: ["expenses"] as const,
  lists: () => [...expenseKeys.all, "list"] as const,
  summary: () => [...expenseKeys.all, "summary"] as const,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Summary type
// ---------------------------------------------------------------------------

export interface ExpenseSummary {
  totalBilled: number
  totalReimbursable: number
  totalPending: number
  formattedBilled: string
  formattedReimbursable: string
}

function computeSummary(rows: ExpenseRow[]): ExpenseSummary {
  const billed = rows
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + Number(e.amount), 0)
  const reimbursable = rows
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + Number(e.amount), 0)
  const pending = rows.filter((e) => e.status === "pending").length

  return {
    totalBilled: billed,
    totalReimbursable: reimbursable,
    totalPending: pending,
    formattedBilled: formatCurrency(billed),
    formattedReimbursable: formatCurrency(reimbursable),
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all expenses for the current user. */
export function useExpenses() {
  return useQuery({
    queryKey: expenseKeys.lists(),
    queryFn: async (): Promise<ExpenseRow[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as ExpenseRow[]
    },
  })
}

/** Derive computed expense summary from the cached list. */
export function useExpenseSummary() {
  return useQuery({
    queryKey: expenseKeys.summary(),
    queryFn: async (): Promise<ExpenseSummary> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, currency, status")

      if (error) throw new Error(error.message)
      return computeSummary((data ?? []) as ExpenseRow[])
    },
  })
}

/** Create a new expense record. */
export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("expenses")
        .insert([
          {
            project_id: payload.projectId,
            tenant_id: user.id, // tenant_id maps to user's profile id
            user_id: user.id,
            description: payload.description,
            amount: payload.amount,
            currency: payload.currency ?? "USD",
            category: payload.category,
            expense_date: payload.expenseDate,
            receipt_url: payload.receiptUrl ?? null,
            notes: payload.notes ?? null,
          },
        ])
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ExpenseRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: expenseKeys.summary() })
    },
  })
}

/** Update an expense record. */
export interface UpdateExpensePayload {
  id: string
  description?: string
  amount?: number
  currency?: string
  category?: string
  expenseDate?: string
  receiptUrl?: string
  notes?: string
  status?: ExpenseRow["status"]
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      description,
      amount,
      currency,
      category,
      expenseDate,
      receiptUrl,
      notes,
      status,
    }: UpdateExpensePayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("expenses")
        .update({
          ...(description !== undefined && { description }),
          ...(amount !== undefined && { amount }),
          ...(currency !== undefined && { currency }),
          ...(category !== undefined && { category }),
          ...(expenseDate !== undefined && { expense_date: expenseDate }),
          ...(receiptUrl !== undefined && { receipt_url: receiptUrl }),
          ...(notes !== undefined && { notes }),
          ...(status !== undefined && { status }),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ExpenseRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: expenseKeys.summary() })
    },
  })
}

/** Delete an expense record. */
export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: expenseKeys.summary() })
    },
  })
}

// ---------------------------------------------------------------------------
// Re-export formatters for use in the page
// ---------------------------------------------------------------------------
export { formatCurrency as formatExpenseCurrency, formatDate as formatExpenseDate }
