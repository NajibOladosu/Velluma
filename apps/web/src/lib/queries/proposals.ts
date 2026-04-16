/**
 * TanStack Query hooks for Proposals.
 *
 * Data strategy: Proposals are stored in the `projects` table, queried directly
 * from Supabase. RLS ensures users only see their own rows (tenant_id = auth.uid()).
 *
 * metadata JSONB keys:
 *   template:           string
 *   section_count:      number
 *   view_count:         number
 *   deposit_percent:    number (0-100)
 *   milestones:         number
 *   welcome_message:    string
 *   scope_content:      string (HTML from TipTap)
 *   selected_tier:      string | null
 *   add_ons:            AddOnItem[]
 *   enabled_clauses:    string[]
 *   automations:        { id: string; enabled: boolean }[]
 *   reminder_enabled:   boolean
 *   sent_at:            ISO string
 *   viewed_at:          ISO string
 *   signed_at:          ISO string
 *   expires_at:         ISO string
 *   avg_time_spent:     string
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

export interface ProjectRow {
  id: string
  tenant_id: string | null
  user_id: string | null
  client_id: string | null
  title: string
  description: string | null
  status: string
  total_budget: number | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  crm_clients?: { name: string; email: string | null } | null
}

// ---------------------------------------------------------------------------
// UI-facing type
// ---------------------------------------------------------------------------

export type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "expired"

export interface AddOnItem {
  id: string
  label: string
  price: number
  enabled: boolean
}

export interface Proposal {
  id: string
  title: string
  client: string
  clientId: string
  clientEmail: string | null
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
  // Builder-specific fields
  welcomeMessage: string
  depositPercent: number
  milestones: number
  avgTimeSpent: string
  metadata: Record<string, unknown>
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
// Mappers
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
    archived: "expired",
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
    client: row.crm_clients?.name ?? row.crm_clients?.email ?? "Unknown Client",
    clientId: row.client_id ?? "",
    clientEmail: row.crm_clients?.email ?? null,
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
    welcomeMessage: (meta.welcome_message as string) ?? "",
    depositPercent: Number(meta.deposit_percent) || 50,
    milestones: Number(meta.milestones) || 3,
    avgTimeSpent: (meta.avg_time_spent as string) ?? "—",
    metadata: meta,
  }
}

// ---------------------------------------------------------------------------
// Hooks — reads
// ---------------------------------------------------------------------------

/** Fetch all proposals for the current tenant. */
export function useProposals() {
  return useQuery({
    queryKey: proposalKeys.lists(),
    queryFn: async (): Promise<Proposal[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .select("*, crm_clients(name, email)")
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
        .select("*, crm_clients(name, email)")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProposal(data as ProjectRow)
    },
    enabled: Boolean(id),
  })
}

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface CreateProposalPayload {
  title: string
  clientId?: string
  template?: string
  description?: string
}

export interface SaveProposalContentPayload {
  id: string
  welcomeMessage?: string
  scopeContent?: string
  selectedTier?: string | null
  addOns?: AddOnItem[]
  enabledClauses?: string[]
  depositPercent?: number
  milestones?: number
  automations?: Array<{ id: string; enabled: boolean }>
  reminderEnabled?: boolean
}

// ---------------------------------------------------------------------------
// Hooks — mutations
// ---------------------------------------------------------------------------

/** Create a new proposal in draft status. */
export function useCreateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProposalPayload) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("projects")
        .insert({
          tenant_id: user.id,
          user_id: user.id,
          client_id: payload.clientId || null,
          title: payload.title,
          description: payload.description ?? null,
          status: "draft",
          metadata: {
            template: payload.template ?? "blank",
            section_count: 0,
            view_count: 0,
            deposit_percent: 50,
            milestones: 3,
            welcome_message: "",
          },
        })
        .select("*, crm_clients(name, email)")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProposal(data as ProjectRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}

/** Save the full builder state (welcome message, scope, tier, add-ons, clauses, etc.). */
export function useSaveProposalContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SaveProposalContentPayload) => {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from("projects")
        .select("metadata, total_budget")
        .eq("id", payload.id)
        .single()

      const meta = (existing?.metadata ?? {}) as Record<string, unknown>

      // Recalculate budget from tier + enabled add-ons
      const tierPrices: Record<string, number> = {
        foundation: 2500,
        scale: 5500,
        enterprise: 9500,
      }
      const tier =
        payload.selectedTier !== undefined
          ? payload.selectedTier
          : (meta.selected_tier as string | undefined)
      const tierPrice = tier ? (tierPrices[tier] ?? 0) : 0
      const addOns =
        payload.addOns !== undefined
          ? payload.addOns
          : ((meta.add_ons as AddOnItem[]) ?? [])
      const addOnsTotal = addOns
        .filter((a) => a.enabled)
        .reduce((s, a) => s + a.price, 0)
      const totalBudget =
        tierPrice + addOnsTotal > 0
          ? tierPrice + addOnsTotal
          : Number(existing?.total_budget) || null

      const merged: Record<string, unknown> = {
        ...meta,
        ...(payload.welcomeMessage !== undefined && {
          welcome_message: payload.welcomeMessage,
        }),
        ...(payload.scopeContent !== undefined && {
          scope_content: payload.scopeContent,
        }),
        ...(payload.selectedTier !== undefined && {
          selected_tier: payload.selectedTier,
        }),
        ...(payload.addOns !== undefined && { add_ons: payload.addOns }),
        ...(payload.enabledClauses !== undefined && {
          enabled_clauses: payload.enabledClauses,
        }),
        ...(payload.depositPercent !== undefined && {
          deposit_percent: payload.depositPercent,
        }),
        ...(payload.milestones !== undefined && {
          milestones: payload.milestones,
        }),
        ...(payload.automations !== undefined && {
          automations: payload.automations,
        }),
        ...(payload.reminderEnabled !== undefined && {
          reminder_enabled: payload.reminderEnabled,
        }),
      }

      const { data, error } = await supabase
        .from("projects")
        .update({
          metadata: merged,
          total_budget: totalBudget,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select("*, crm_clients(name, email)")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProposal(data as ProjectRow)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}

/** Update the proposal status (sent, expired, archived, etc.). */
export function useUpdateProposalStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from("projects")
        .select("metadata")
        .eq("id", id)
        .single()

      const meta = (existing?.metadata ?? {}) as Record<string, unknown>
      if (status === "sent") meta.sent_at = new Date().toISOString()

      const { data, error } = await supabase
        .from("projects")
        .update({ status, metadata: meta, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, crm_clients(name, email)")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProposal(data as ProjectRow)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}

/** Duplicate a proposal as a new draft. */
export function useDuplicateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: source } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single()
      if (!source) throw new Error("Proposal not found")

      // Strip per-send tracking fields from the copy
      const {
        sent_at: _s,
        viewed_at: _va,
        signed_at: _sa,
        view_count: _vc,
        ...restMeta
      } = (source.metadata ?? {}) as Record<string, unknown>

      const { data, error } = await supabase
        .from("projects")
        .insert({
          tenant_id: user.id,
          user_id: user.id,
          client_id: source.client_id,
          title: `${source.title} (Copy)`,
          description: source.description,
          status: "draft",
          total_budget: source.total_budget,
          metadata: { ...restMeta, view_count: 0 },
        })
        .select("*, crm_clients(name, email)")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProposal(data as ProjectRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}

/** Hard-delete a proposal. */
export function useDeleteProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from("projects").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}

/** Update proposal content/metadata (generic patch). */
export function useUpdateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: unknown }) => {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from("projects")
        .select("metadata")
        .eq("id", id)
        .single()

      const merged = { ...(existing?.metadata ?? {}), content }

      const { data, error } = await supabase
        .from("projects")
        .update({ metadata: merged, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, crm_clients(name, email)")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProposal(data as ProjectRow)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() })
    },
  })
}
