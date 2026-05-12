/**
 * TanStack Query hooks for Invoices.
 *
 * Data strategy: Invoices are modelled on top of `contract_payments` — the
 * table that records escrow deposits, releases, and refunds. RLS on
 * `contract_payments` surfaces only rows where the caller is the payer or
 * payee via the joined `contracts` record.
 *
 * Note: A dedicated `invoices` table (H7 on the production roadmap) will
 * eventually replace this. When that table lands, swap the `from()` call.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

interface ContractPaymentRow {
  id: string
  /** Optional now — invoice can attach to a project even without a contract. */
  contract_id: string | null
  project_id: string | null
  user_id: string
  amount: number
  currency: string
  payment_type: "escrow" | "release" | "refund"
  status: "pending" | "completed" | "failed" | "refunded"
  created_at: string
  completed_at: string | null
  contracts: { title: string; client_email: string | null } | null
  projects: { title: string } | null
}

// ---------------------------------------------------------------------------
// UI-facing type
// ---------------------------------------------------------------------------

export type InvoiceStatus = "paid" | "processing" | "upcoming" | "overdue"

export interface Invoice {
  id: string
  number: string
  client: string
  amount: string
  numericAmount: number
  status: InvoiceStatus
  dueDate: string
  sentDate: string
  contractId: string
  contractTitle: string
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  detail: (id: string) => [...invoiceKeys.all, "detail", id] as const,
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapPaymentStatus(
  status: ContractPaymentRow["status"],
  paymentType: ContractPaymentRow["payment_type"],
): InvoiceStatus {
  if (status === "completed" || paymentType === "release") return "paid"
  if (status === "refunded") return "paid"
  if (status === "failed") return "overdue"
  return "processing" // pending
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function mapRowToInvoice(row: ContractPaymentRow, index: number): Invoice {
  const numericAmount = Number(row.amount) || 0
  const paddedIndex = String(index + 1).padStart(4, "0")
  // Display label prefers the project name, falls back to contract title.
  const projectTitle = row.projects?.title ?? row.contracts?.title ?? "—"
  return {
    id: row.id,
    number: `INV-${paddedIndex}`,
    client: row.contracts?.client_email ?? "Unknown",
    amount: formatCurrency(numericAmount, row.currency),
    numericAmount,
    status: mapPaymentStatus(row.status, row.payment_type),
    dueDate: row.completed_at ? formatDate(row.completed_at) : "—",
    sentDate: formatDate(row.created_at),
    contractId: row.contract_id ?? "",
    contractTitle: projectTitle,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all payment records (surfaced as invoices) for the current user. */
export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.lists(),
    queryFn: async (): Promise<Invoice[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contract_payments")
        .select("*, contracts(title, client_email), projects(title)")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return ((data ?? []) as ContractPaymentRow[]).map(mapRowToInvoice)
    },
  })
}

/** Fetch a single payment/invoice by ID. */
export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: async (): Promise<Invoice> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contract_payments")
        .select("*, contracts(title, client_email), projects(title)")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return mapRowToInvoice(data as ContractPaymentRow, 0)
    },
    enabled: Boolean(id),
  })
}

/** Create a new payment record (escrow deposit / invoice). */
export interface CreateInvoicePayload {
  /** Project this invoice bills against. Primary link. */
  projectId?: string | null
  /** Optional contract reference — for legal/escrow linkage. */
  contractId?: string | null
  amount: number
  currency?: string
  paymentType?: ContractPaymentRow["payment_type"]
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      if (!payload.projectId && !payload.contractId) {
        throw new Error("Invoice must be linked to a project or a contract")
      }

      const { data, error } = await supabase
        .from("contract_payments")
        .insert([
          {
            project_id: payload.projectId ?? null,
            contract_id: payload.contractId ?? null,
            user_id: user.id,
            amount: payload.amount,
            currency: payload.currency ?? "USD",
            payment_type: payload.paymentType ?? "escrow",
            status: "pending",
          },
        ])
        .select("*, contracts(title, client_email), projects(title)")
        .single()

      if (error) throw new Error(error.message)
      return data as ContractPaymentRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}

/** Update a payment record's status or completion date. */
export interface UpdateInvoicePayload {
  id: string
  status?: ContractPaymentRow["status"]
  completedAt?: string
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, completedAt }: UpdateInvoicePayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contract_payments")
        .update({
          ...(status !== undefined && { status }),
          ...(completedAt !== undefined && { completed_at: completedAt }),
        })
        .eq("id", id)
        .select("*, contracts(title, client_email), projects(title)")
        .single()

      if (error) throw new Error(error.message)
      return data as ContractPaymentRow
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}

/** Delete a payment record. */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("contract_payments")
        .delete()
        .eq("id", id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}
