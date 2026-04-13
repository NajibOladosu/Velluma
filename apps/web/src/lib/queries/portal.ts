/**
 * TanStack Query hooks for the Client Portal.
 *
 * Data strategy: query Supabase directly from the browser. The client is
 * authenticated via Supabase magic-link (OTP), so auth.uid() = their user ID.
 * RLS on `contracts` surfaces rows where client_id = auth.uid() or
 * client_email matches their verified email address.
 *
 * No API Gateway calls are made from the portal — all reads go through
 * Supabase directly. Writes (e.g., signing) route through the API Gateway.
 */
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const portalKeys = {
  all: ["portal"] as const,
  contracts: () => [...portalKeys.all, "contracts"] as const,
  milestones: (contractId: string) =>
    [...portalKeys.all, "milestones", contractId] as const,
  payments: (contractId: string) =>
    [...portalKeys.all, "payments", contractId] as const,
  escrow: (contractId: string) =>
    [...portalKeys.all, "escrow", contractId] as const,
  documents: (contractId: string) =>
    [...portalKeys.all, "documents", contractId] as const,
}

// ---------------------------------------------------------------------------
// DB row interfaces (minimal — only what the portal renders)
// ---------------------------------------------------------------------------

interface ContractRow {
  id: string
  title: string
  status: string
  total_amount: number | null
  currency: string
  client_email: string | null
  signed_by_client: string | null
  signed_by_freelancer: string | null
  created_at: string
  updated_at: string
}

interface MilestoneRow {
  id: string
  title: string
  description: string | null
  amount: number
  due_date: string | null
  status: string
  completed_at: string | null
}

interface PaymentRow {
  id: string
  amount: number
  currency: string
  payment_type: string
  status: string
  created_at: string
  completed_at: string | null
  metadata: Record<string, unknown> | null
}

interface EscrowRow {
  id: string
  funded_amount: number
  currency: string
  status: string
  funded_at: string
  released_at: string | null
}

interface DocumentRow {
  id: string
  version: number
  content: string
  format: string
  storage_url: string | null
  generated_at: string
}

// ---------------------------------------------------------------------------
// UI-facing types
// ---------------------------------------------------------------------------

export interface PortalContract {
  id: string
  title: string
  status: string
  totalAmount: number
  currency: string
  clientEmail: string | null
  signedByClient: string | null
  signedByFreelancer: string | null
  createdAt: string
  updatedAt: string
}

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "disputed"

export interface PortalMilestone {
  id: string
  title: string
  description: string | null
  amount: number
  dueDate: string | null
  status: MilestoneStatus
  completedAt: string | null
}

export interface PortalPayment {
  id: string
  amount: number
  currency: string
  paymentType: "escrow" | "release" | "refund"
  status: "pending" | "completed" | "failed" | "refunded"
  createdAt: string
  completedAt: string | null
  label: string | null
}

export interface PortalEscrow {
  id: string
  fundedAmount: number
  currency: string
  status: "active" | "released" | "refunded" | "disputed"
  fundedAt: string
  releasedAt: string | null
}

export interface PortalDocument {
  id: string
  version: number
  content: string
  format: string
  storageUrl: string | null
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all contracts where the authenticated user is the client.
 * Matches on both client_id (UUID) and client_email to cover contracts
 * created before the client's Supabase account existed.
 */
export function usePortalContracts() {
  return useQuery({
    queryKey: portalKeys.contracts(),
    queryFn: async (): Promise<PortalContract[]> => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, title, status, total_amount, currency, client_email, " +
            "signed_by_client, signed_by_freelancer, created_at, updated_at",
        )
        .or(`client_id.eq.${user.id},client_email.eq.${user.email}`)
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)

      return ((data ?? []) as unknown as ContractRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        totalAmount: Number(row.total_amount) || 0,
        currency: row.currency ?? "USD",
        clientEmail: row.client_email,
        signedByClient: row.signed_by_client,
        signedByFreelancer: row.signed_by_freelancer,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    },
  })
}

/** Fetch milestones for a contract, ordered by due date ascending. */
export function usePortalMilestones(contractId: string) {
  return useQuery({
    queryKey: portalKeys.milestones(contractId),
    queryFn: async (): Promise<PortalMilestone[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("milestones")
        .select("id, title, description, amount, due_date, status, completed_at")
        .eq("contract_id", contractId)
        .order("due_date", { ascending: true })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: MilestoneRow) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        amount: Number(row.amount) || 0,
        dueDate: row.due_date,
        status: row.status as MilestoneStatus,
        completedAt: row.completed_at,
      }))
    },
    enabled: Boolean(contractId),
  })
}

/** Fetch contract_payments for a contract (escrow deposits + releases). */
export function usePortalPayments(contractId: string) {
  return useQuery({
    queryKey: portalKeys.payments(contractId),
    queryFn: async (): Promise<PortalPayment[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contract_payments")
        .select(
          "id, amount, currency, payment_type, status, created_at, completed_at, metadata",
        )
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: PaymentRow) => ({
        id: row.id,
        amount: Number(row.amount) || 0,
        currency: row.currency ?? "USD",
        paymentType: row.payment_type as PortalPayment["paymentType"],
        status: row.status as PortalPayment["status"],
        createdAt: row.created_at,
        completedAt: row.completed_at,
        label: (row.metadata?.label as string) ?? null,
      }))
    },
    enabled: Boolean(contractId),
  })
}

/** Fetch escrow records for a contract (funds held on behalf of the client). */
export function usePortalEscrow(contractId: string) {
  return useQuery({
    queryKey: portalKeys.escrow(contractId),
    queryFn: async (): Promise<PortalEscrow[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contract_escrows")
        .select("id, funded_amount, currency, status, funded_at, released_at")
        .eq("contract_id", contractId)
        .order("funded_at", { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: EscrowRow) => ({
        id: row.id,
        fundedAmount: Number(row.funded_amount) || 0,
        currency: row.currency ?? "USD",
        status: row.status as PortalEscrow["status"],
        fundedAt: row.funded_at,
        releasedAt: row.released_at,
      }))
    },
    enabled: Boolean(contractId),
  })
}

/** Fetch generated contract documents (PDFs, markdown versions). */
export function usePortalDocuments(contractId: string) {
  return useQuery({
    queryKey: portalKeys.documents(contractId),
    queryFn: async (): Promise<PortalDocument[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contract_documents")
        .select("id, version, content, format, storage_url, generated_at")
        .eq("contract_id", contractId)
        .order("version", { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: DocumentRow) => ({
        id: row.id,
        version: row.version,
        content: row.content,
        format: row.format,
        storageUrl: row.storage_url,
        generatedAt: row.generated_at,
      }))
    },
    enabled: Boolean(contractId),
  })
}
