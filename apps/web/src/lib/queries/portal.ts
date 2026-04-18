/**
 * TanStack Query hooks for the Client Portal.
 *
 * Clients authenticate via a scoped share-link cookie (no Supabase user).
 * These hooks call /api/portal/* routes which validate the cookie server-
 * side using a service-role Supabase client and filter rows by the
 * allowlist embedded in the session. See lib/portal/session.ts.
 */
import { useQuery } from "@tanstack/react-query"

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const portalKeys = {
  all: ["portal"] as const,
  session: () => [...portalKeys.all, "session"] as const,
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

export interface PortalSession {
  email: string
  engagements: { type: "proposal" | "contract" | "project"; id: string }[]
  expiresAt: string
}

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
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function usePortalSession() {
  return useQuery({
    queryKey: portalKeys.session(),
    queryFn: () => fetchJSON<PortalSession>("/api/portal/session"),
  })
}

export function usePortalContracts() {
  return useQuery({
    queryKey: portalKeys.contracts(),
    queryFn: async (): Promise<PortalContract[]> => {
      const { data } = await fetchJSON<{ data: ContractRow[] }>("/api/portal/contracts")
      return (data ?? []).map((row) => ({
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

export function usePortalMilestones(contractId: string) {
  return useQuery({
    queryKey: portalKeys.milestones(contractId),
    queryFn: async (): Promise<PortalMilestone[]> => {
      const { data } = await fetchJSON<{ data: MilestoneRow[] }>(
        `/api/portal/contracts/${contractId}/milestones`,
      )
      return (data ?? []).map((row) => ({
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

export function usePortalPayments(contractId: string) {
  return useQuery({
    queryKey: portalKeys.payments(contractId),
    queryFn: async (): Promise<PortalPayment[]> => {
      const { data } = await fetchJSON<{ data: PaymentRow[] }>(
        `/api/portal/contracts/${contractId}/payments`,
      )
      return (data ?? []).map((row) => ({
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

export function usePortalEscrow(contractId: string) {
  return useQuery({
    queryKey: portalKeys.escrow(contractId),
    queryFn: async (): Promise<PortalEscrow[]> => {
      const { data } = await fetchJSON<{ data: EscrowRow[] }>(
        `/api/portal/contracts/${contractId}/escrow`,
      )
      return (data ?? []).map((row) => ({
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

export function usePortalDocuments(contractId: string) {
  return useQuery({
    queryKey: portalKeys.documents(contractId),
    queryFn: async (): Promise<PortalDocument[]> => {
      const { data } = await fetchJSON<{ data: DocumentRow[] }>(
        `/api/portal/contracts/${contractId}/documents`,
      )
      return (data ?? []).map((row) => ({
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
