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
  contract_id: string
  user_id: string
  amount: number
  currency: string
  payment_type: "escrow" | "release" | "refund"
  status: "pending" | "completed" | "failed" | "refunded"
  created_at: string
  completed_at: string | null
  contracts: { title: string; client_email: string | null } | null
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
  return {
    id: row.id,
    number: `INV-${paddedIndex}`,
    client: row.contracts?.client_email ?? "Unknown",
    amount: formatCurrency(numericAmount, row.currency),
    numericAmount,
    status: mapPaymentStatus(row.status, row.payment_type),
    dueDate: row.completed_at ? formatDate(row.completed_at) : "—",
    sentDate: formatDate(row.created_at),
    contractId: row.contract_id,
    contractTitle: row.contracts?.title ?? "Contract",
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
        .select("*, contracts(title, client_email)")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return ((data ?? []) as ContractPaymentRow[]).map(mapRowToInvoice)
    },
  })
}
