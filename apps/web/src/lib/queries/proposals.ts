/**
 * TanStack Query hooks for Proposals.
 *
 * Data strategy: Proposals are stored in the `projects` table by the
 * document-service (a proposal is a project record with proposal metadata in
 * `metadata.content`). Reads query Supabase directly; writes route through the
 * API Gateway (`/proposals`) which calls the document microservice.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { api } from "@/lib/api-client"

// ---------------------------------------------------------------------------
// DB row type  (projects table, used as proposals)
// ---------------------------------------------------------------------------

export interface ProjectRow {
  id: string
  tenant_id: string | null
  client_id: string | null
  title: string
  description: string | null
  status: string
  total_budget: number | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  clients?: { name: string; email: string | null } | null
}

// ---------------------------------------------------------------------------
// UI-facing type
// ---------------------------------------------------------------------------

export type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "expired"

export interface Proposal {
  id: string
  title: string
  client: string
  clientId: string
  status: ProposalStatus
  value: string
  numericValue: number
  createdAt: string
  sentAt: string | null
  viewedAt: string | null
  signedAt: string | null
  expiresAt: string | null
  template: string
  viewCount: number
  sections: number
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const proposalKeys = {
  all: ["proposals"] as const,
  lists: () => [...proposalKeys.all, "list"] as const,
  detail: (id: string) => [...proposalKeys.all, "detail", id] as const,
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapDbToProposalStatus(dbStatus: string): ProposalStatus {
  const map: Record<string, ProposalStatus> = {
    draft: "draft",
    sent: "sent",
    viewed: "viewed",
    signed: "signed",
    completed: "signed",
    cancelled: "expired",
    expired: "expired",
  }
  return map[dbStatus] ?? "draft"
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function mapRowToProposal(row: ProjectRow): Proposal {
  const numericValue = Number(row.total_budget) || 0
  const meta = row.metadata ?? {}
  const sentAt = meta.sent_at as string | undefined
  const viewedAt = meta.viewed_at as string | undefined
  const signedAt = meta.signed_at as string | undefined
  const expiresAt = meta.expires_at as string | undefined

  return {
    id: row.id,
    title: row.title,
    client: row.clients?.name ?? row.clients?.email ?? "Unknown Client",
    clientId: row.client_id ?? "",
    status: mapDbToProposalStatus(row.status),
    value: numericValue > 0 ? formatCurrency(numericValue) : "—",
    numericValue,
    createdAt: formatDate(row.created_at),
    sentAt: sentAt ? formatDate(sentAt) : null,
    viewedAt: viewedAt ? formatDate(viewedAt) : null,
    signedAt: signedAt ? formatDate(signedAt) : null,
    expiresAt: expiresAt ? formatDate(expiresAt) : null,
    template: (meta.template as string) ?? "Blank",
    viewCount: (meta.view_count as number) ?? 0,
    sections: (meta.section_count as number) ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all proposals (project records) for the current tenant. */
export function useProposals() {
  return useQuery({
    queryKey: proposalKeys.lists(),
    queryFn: async (): Promise<Proposal[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name, email)")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return ((data ?? []) as ProjectRow[]).map(mapRowToProposal)
    },
  })
}

/** Fetch a single proposal by ID. */
export function useProposal(id: string) {
  return useQuery({
    queryKey: proposalKeys.detail(id),
    queryFn: async (): Promise<Proposal> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name, email)")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProposal(data as ProjectRow)
    },
    enabled: Boolean(id),
  })
}

/** Create a new proposal via the API Gateway (document microservice). */
export interface CreateProposalPayload {
  title: string
  clientId: string
  template?: string
  description?: string
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProposalPayload) => {
      return api.post("/proposals", {
        title: payload.title,
        clientId: payload.clientId,
        content: {},
        description: payload.description ?? "",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}

/** Update proposal content (rich-text body) via the API Gateway. */
export function useUpdateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: unknown }) => {
      return api.put(`/proposals/${id}`, { content })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}

/** Delete a proposal via the API Gateway (document microservice). */
export function useDeleteProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/proposals/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}
