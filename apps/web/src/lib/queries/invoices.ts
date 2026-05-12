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
  milestone_id: string | null
  user_id: string
  amount: number
  currency: string
  payment_type: "escrow" | "release" | "refund"
  status: "pending" | "completed" | "failed" | "refunded"
  created_at: string
  completed_at: string | null
  // Billing fields added in 20260512110000_invoices_billing_fields.sql
  invoice_number: string | null
  issued_date: string | null
  due_date: string | null
  line_items: InvoiceLineItem[] | null
  tax_amount: number | null
  discount_amount: number | null
  notes: string | null
  stripe_payment_link_url: string | null
  sent_at: string | null
  sent_to_email: string | null
  contracts: { title: string; client_email: string | null } | null
  projects: { title: string } | null
}

export interface InvoiceLineItem {
  description: string
  qty: number
  unit_price: number
  total: number
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
  // Detail-view fields
  projectId: string | null
  currency: string
  lineItems: InvoiceLineItem[]
  taxAmount: number
  discountAmount: number
  subtotal: number
  total: number
  notes: string | null
  stripePaymentLinkUrl: string | null
  sentAt: string | null
  sentToEmail: string | null
  issuedDate: string | null
  dueDateIso: string | null
  completedAt: string | null
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
  const tax = Number(row.tax_amount) || 0
  const discount = Number(row.discount_amount) || 0
  const lineItems: InvoiceLineItem[] = Array.isArray(row.line_items)
    ? row.line_items
    : []
  const subtotal = lineItems.length > 0
    ? lineItems.reduce((sum, li) => sum + Number(li.total) || 0, 0)
    : numericAmount
  const total = subtotal + tax - discount

  // Use the DB-generated invoice_number when present; only fall back to the
  // positional INV-####  when migrating rows that pre-date the column.
  const paddedIndex = String(index + 1).padStart(4, "0")
  const number = row.invoice_number ?? `INV-${paddedIndex}`

  // Display label prefers the project name, falls back to contract title.
  const projectTitle = row.projects?.title ?? row.contracts?.title ?? "—"
  return {
    id: row.id,
    number,
    client: row.sent_to_email ?? row.contracts?.client_email ?? "Unknown",
    amount: formatCurrency(numericAmount, row.currency),
    numericAmount,
    status: mapPaymentStatus(row.status, row.payment_type),
    dueDate: row.due_date
      ? formatDate(row.due_date)
      : row.completed_at
        ? formatDate(row.completed_at)
        : "—",
    sentDate: row.sent_at ? formatDate(row.sent_at) : formatDate(row.created_at),
    contractId: row.contract_id ?? "",
    contractTitle: projectTitle,
    projectId: row.project_id,
    currency: row.currency ?? "USD",
    lineItems,
    taxAmount: tax,
    discountAmount: discount,
    subtotal,
    total,
    notes: row.notes,
    stripePaymentLinkUrl: row.stripe_payment_link_url,
    sentAt: row.sent_at,
    sentToEmail: row.sent_to_email,
    issuedDate: row.issued_date,
    dueDateIso: row.due_date,
    completedAt: row.completed_at,
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
  /** Optional milestone — only set when the parent contract is milestone-priced. */
  milestoneId?: string | null
  amount: number
  currency?: string
  paymentType?: ContractPaymentRow["payment_type"]
  // Structured billing
  lineItems?: InvoiceLineItem[]
  taxAmount?: number
  discountAmount?: number
  notes?: string
  dueDate?: string  // YYYY-MM-DD
  issuedDate?: string // YYYY-MM-DD
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
            milestone_id: payload.milestoneId ?? null,
            user_id: user.id,
            amount: payload.amount,
            currency: payload.currency ?? "USD",
            payment_type: payload.paymentType ?? "escrow",
            status: "pending",
            line_items: payload.lineItems ?? [],
            tax_amount: payload.taxAmount ?? 0,
            discount_amount: payload.discountAmount ?? 0,
            notes: payload.notes ?? null,
            due_date: payload.dueDate ?? null,
            issued_date: payload.issuedDate ?? null,
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

/**
 * Send an invoice. Posts to /api/invoices/[id]/send which:
 *   - Renders the HTML email server-side
 *   - Records sent_at + sent_to_email
 *   - (Once Stripe Connect is configured) generates a Payment Link
 *   - (Once Resend / Postmark / SES is wired) actually transmits the email
 *
 * Today the route stamps sent_at and returns the rendered HTML so the
 * Send dialog can preview-then-confirm — see DESIGN_NOTES.md §2.
 */
export interface SendInvoicePayload {
  id: string
  to: string
  subject?: string
  body?: string
  cc?: string
  includePdf?: boolean
}

export interface SendInvoiceResult {
  ok: boolean
  emailHtml: string
  paymentLinkUrl: string | null
  sentAt: string
  delivered: boolean
  deliveryProvider: string | null
}

export function useSendInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SendInvoicePayload): Promise<SendInvoiceResult> => {
      const res = await fetch(`/api/invoices/${payload.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: payload.to,
          subject: payload.subject,
          body: payload.body,
          cc: payload.cc,
          includePdf: payload.includePdf,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? `Send failed (HTTP ${res.status})`)
      }
      return (await res.json()) as SendInvoiceResult
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}

/** Fetch the rendered HTML preview without actually sending. */
export interface InvoicePreviewResult {
  emailHtml: string
  subject: string
  toSuggestion: string | null
}
export function useInvoicePreview(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...invoiceKeys.detail(id), "preview"],
    queryFn: async (): Promise<InvoicePreviewResult> => {
      const res = await fetch(`/api/invoices/${id}/send?preview=1`, {
        method: "GET",
      })
      if (!res.ok) throw new Error(`Preview failed (HTTP ${res.status})`)
      return (await res.json()) as InvoicePreviewResult
    },
    enabled: Boolean(id) && enabled,
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
