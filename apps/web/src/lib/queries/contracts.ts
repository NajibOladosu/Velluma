/**
 * TanStack Query hooks for Contracts.
 *
 * Data strategy:
 * - Reads: query Supabase directly. RLS on `contracts` ensures users only see
 *   rows where they are the freelancer or client.
 * - Writes (sign, change-request): route through the API Gateway (business logic
 *   lives in the contract microservice).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { api } from "@/lib/api-client"

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

export interface ContractSection {
  id: string
  title: string
  content: string
}

export type DbContractStatus =
  | "draft"
  | "awaiting_freelancer_review"
  | "freelancer_accepted"
  | "pending"
  | "signed"
  | "funded"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"

export interface ContractRow {
  id: string
  title: string
  description: string | null
  creator_id: string
  template_id: string | null
  status: DbContractStatus
  total_amount: number | null
  currency: string
  created_at: string
  updated_at: string
  client_id: string | null
  freelancer_id: string | null
  client_email: string | null
  signed_by_client: string | null
  signed_by_freelancer: string | null
  tenant_id: string | null
  content: { sections: ContractSection[] } | null
  ai_enhanced: boolean | null
}

export interface ContractTemplateRow {
  id: string
  name: string
  description: string | null
  content: Record<string, unknown>
  is_active: boolean | null
  created_at: string
}

// ---------------------------------------------------------------------------
// UI-facing types (what the contracts page expects)
// ---------------------------------------------------------------------------

export type ContractStatus = "draft" | "pending" | "signed" | "expired"

export interface ContractSigner {
  id: string
  name: string
  role: string
  status: "pending" | "signed"
}

export interface Contract {
  id: string
  title: string
  client: string
  clientId: string
  status: ContractStatus
  value: string
  numericValue: number
  createdAt: string
  sentAt: string | null
  signedAt: string | null
  expiresAt: string | null
  template: string
  description: string
  signers: ContractSigner[]
  sections: ContractSection[]
  aiEnhanced: boolean
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
  type: "standard" | "custom"
  lastModified: string
  usageCount: number
  lockedClauses: number
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const contractKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractKeys.all, "list"] as const,
  detail: (id: string) => [...contractKeys.all, "detail", id] as const,
  templates: () => [...contractKeys.all, "templates"] as const,
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapDbStatus(dbStatus: DbContractStatus): ContractStatus {
  if (dbStatus === "draft") return "draft"
  if (
    dbStatus === "awaiting_freelancer_review" ||
    dbStatus === "freelancer_accepted" ||
    dbStatus === "pending"
  )
    return "pending"
  if (
    dbStatus === "signed" ||
    dbStatus === "funded" ||
    dbStatus === "in_progress"
  )
    return "signed"
  return "expired" // completed | cancelled | disputed
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function mapRowToContract(row: ContractRow): Contract {
  const numericValue = Number(row.total_amount) || 0
  const signers: ContractSigner[] = [
    {
      id: row.freelancer_id ?? "freelancer",
      name: "You",
      role: "Freelancer",
      status: row.signed_by_freelancer ? "signed" : "pending",
    },
    {
      id: row.client_id ?? "client",
      name: row.client_email ?? "Client",
      role: "Client",
      status: row.signed_by_client ? "signed" : "pending",
    },
  ]

  return {
    id: row.id,
    title: row.title,
    client: row.client_email ?? "Unknown Client",
    clientId: row.client_id ?? "",
    status: mapDbStatus(row.status),
    value: formatCurrency(numericValue, row.currency),
    numericValue,
    createdAt: formatDate(row.created_at),
    sentAt: null,
    signedAt: row.signed_by_client ? formatDate(row.signed_by_client) : null,
    expiresAt: null,
    template: "Standard Contract",
    description: row.description ?? "",
    signers,
    sections: row.content?.sections ?? [],
    aiEnhanced: row.ai_enhanced ?? false,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all contracts for the current user (as freelancer or client). */
export function useContracts() {
  return useQuery({
    queryKey: contractKeys.lists(),
    queryFn: async (): Promise<Contract[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return ((data ?? []) as ContractRow[]).map(mapRowToContract)
    },
  })
}

/** Fetch a single contract by ID. */
export function useContract(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: async (): Promise<Contract> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return mapRowToContract(data as ContractRow)
    },
    enabled: Boolean(id),
  })
}

/** Fetch all contract templates. */
export function useContractTemplates() {
  return useQuery({
    queryKey: contractKeys.templates(),
    queryFn: async (): Promise<ContractTemplate[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return ((data ?? []) as ContractTemplateRow[]).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? "",
        type: "custom" as const,
        lastModified: formatDate(t.created_at),
        usageCount: 0,
        lockedClauses: 0,
      }))
    },
  })
}

/** Create a new contract draft via the API Gateway. */
export interface CreateContractPayload {
  title: string
  clientEmail: string
  templateId?: string
  description?: string
  totalAmount?: number
}

export function useCreateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateContractPayload) => {
      return api.post("/contracts/generate", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
    },
  })
}
