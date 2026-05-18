/**
 * TanStack Query hooks for the Sales Pipeline.
 *
 * Data strategy: Pipeline leads are stored in the `pipeline_leads` table.
 * The `metadata` JSONB column stores pipeline-specific fields:
 *   - pipeline_stage: "inquiry" | "proposal_sent" | "contract_signed" | "active"
 *   - deal_value: number
 *   - priority: "high" | "medium" | "low"
 *   - source: string
 *   - ai_priority: "hot" | "likely" | null
 *   - last_action_at: ISO string
 *   - enrichment: { company_size, industry, confidence }
 *   - archived: boolean (soft-delete)
 *
 * RLS on `pipeline_leads` ensures users only see their own rows (tenant_id = auth.uid()).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

export interface PipelineClientRow {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  website: string | null
  linkedin_profile: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  /** Project the lead has progressed into (set when proposal/contract exists). */
  project_id: string | null
  /** Embedded project from `.select("*, projects(*)")` — source of truth for deal value. */
  projects: { title: string; total_budget: number | null } | null
}

// ---------------------------------------------------------------------------
// UI-facing types
// ---------------------------------------------------------------------------

export interface PipelineLead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  website: string
  value: string
  numericValue: number
  priority: "high" | "medium" | "low"
  aiPriority: "hot" | "likely" | null
  lastAction: string
  tags: string[]
  source: string
  createdAt: string
  enrichment: {
    linkedin: string
    companySize: string
    industry: string
    confidence: number
  }
  timeline: { action: string; time: string; type: "email" | "call" | "note" | "system" | "automation" }[]
}

export interface PipelineStageData {
  id: string
  title: string
  color: string
  leads: PipelineLead[]
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const pipelineKeys = {
  all: ["pipeline"] as const,
  stages: () => [...pipelineKeys.all, "stages"] as const,
  stagesConfig: () => [...pipelineKeys.all, "stages-config"] as const,
}

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------

export interface StageConfig {
  id: string
  title: string
  color: string
  /** True for built-in stages referenced by DB auto-transition triggers; users cannot delete these. */
  system?: boolean
}

/**
 * Default stages for accounts that haven't customized their pipeline.
 * The first four are referenced by the DB auto-transition triggers; "won" and "lost"
 * are terminal stages. Keep the IDs stable — they're keys, not labels.
 */
export const DEFAULT_PIPELINE_STAGES: StageConfig[] = [
  { id: "inquiry",         title: "Inquiry",         color: "bg-zinc-900", system: true },
  { id: "proposal_sent",   title: "Proposal Sent",   color: "bg-zinc-700", system: true },
  { id: "contract_signed", title: "Contract Signed", color: "bg-zinc-500", system: true },
  { id: "active",          title: "Active Project",  color: "bg-zinc-400", system: true },
  { id: "won",             title: "Won",             color: "bg-emerald-600", system: true },
  { id: "lost",            title: "Lost",            color: "bg-zinc-300", system: true },
]

/** Built-in IDs that drive DB triggers — protected from deletion. */
export const SYSTEM_STAGE_IDS = new Set(
  DEFAULT_PIPELINE_STAGES.filter((s) => s.system).map((s) => s.id),
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function mapRowToLead(row: PipelineClientRow): PipelineLead {
  const meta = row.metadata ?? {}
  // Prefer the linked project's budget — that's the real, contract-derived
  // value. Fall back to metadata.deal_value (typed manually on the card).
  const projectBudget = Number(row.projects?.total_budget) || 0
  const dealValue = projectBudget > 0 ? projectBudget : Number(meta.deal_value) || 0
  const enrichment = (meta.enrichment as Record<string, unknown>) ?? {}
  const lastActionAt = (meta.last_action_at as string) || row.updated_at

  return {
    id: row.id,
    name: row.name,
    company: row.company_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    value: dealValue > 0 ? formatCurrency(dealValue) : "—",
    numericValue: dealValue,
    priority: ((meta.priority as string) || "medium") as "high" | "medium" | "low",
    aiPriority: ((meta.ai_priority as string) || null) as "hot" | "likely" | null,
    lastAction: formatRelativeDate(lastActionAt),
    tags: row.tags ?? [],
    source: (meta.source as string) ?? "Unknown",
    createdAt: formatDate(row.created_at),
    enrichment: {
      linkedin: row.linkedin_profile ?? "",
      companySize: (enrichment.company_size as string) ?? "Unknown",
      industry: (enrichment.industry as string) ?? "Unknown",
      confidence: Number(enrichment.confidence) || 0,
    },
    timeline: [],
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the user's stage configuration. Returns DEFAULT_PIPELINE_STAGES when
 * the user hasn't customized their pipeline.
 */
export function usePipelineStagesConfig() {
  return useQuery({
    queryKey: pipelineKeys.stagesConfig(),
    queryFn: async (): Promise<StageConfig[]> => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return DEFAULT_PIPELINE_STAGES
      const { data, error } = await supabase
        .from("profiles")
        .select("pipeline_stages")
        .eq("id", user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      const stored = data?.pipeline_stages as StageConfig[] | null | undefined
      if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_PIPELINE_STAGES
      return stored
    },
  })
}

/** Persist the entire stage configuration. NULL clears back to defaults. */
export function useUpsertPipelineStages() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (stages: StageConfig[] | null) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      // Never let users delete a system stage — triggers depend on the IDs.
      if (stages) {
        const presentIds = new Set(stages.map((s) => s.id))
        for (const id of SYSTEM_STAGE_IDS) {
          if (!presentIds.has(id)) {
            throw new Error(`Built-in stage "${id}" cannot be removed.`)
          }
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update({ pipeline_stages: stages })
        .eq("id", user.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
    },
  })
}

/** Fetch all pipeline leads grouped into stages, using the user's config. */
export function usePipelineStages() {
  const { data: stageConfig = DEFAULT_PIPELINE_STAGES } = usePipelineStagesConfig()
  return useQuery({
    queryKey: [...pipelineKeys.stages(), stageConfig.map((s) => s.id).join("|")],
    queryFn: async (): Promise<PipelineStageData[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("pipeline_leads")
        .select("*, projects(title, total_budget)")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)

      const rows = (data ?? []) as PipelineClientRow[]

      const validIds = new Set(stageConfig.map((s) => s.id))
      const stageMap: Record<string, PipelineLead[]> = {}
      for (const s of stageConfig) stageMap[s.id] = []

      for (const row of rows) {
        if (row.metadata?.archived === true) continue // skip archived
        const raw = (row.metadata?.pipeline_stage as string) || "inquiry"
        const target = validIds.has(raw) ? raw : stageConfig[0]?.id ?? "inquiry"
        if (!stageMap[target]) stageMap[target] = []
        stageMap[target].push(mapRowToLead(row))
      }

      return stageConfig.map((s) => ({
        id: s.id,
        title: s.title,
        color: s.color,
        leads: stageMap[s.id] ?? [],
      }))
    },
  })
}

/** Move a lead to a different pipeline stage. */
export function useMovePipelineLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const supabase = createClient()

      // Fetch current metadata first
      const { data: current } = await supabase
        .from("pipeline_leads")
        .select("metadata")
        .eq("id", leadId)
        .single()

      const merged = { ...(current?.metadata ?? {}), pipeline_stage: stageId, last_action_at: new Date().toISOString() }

      const { error } = await supabase
        .from("pipeline_leads")
        .update({ metadata: merged, updated_at: new Date().toISOString() })
        .eq("id", leadId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.stages() })
    },
  })
}

// ---------------------------------------------------------------------------
// Update lead
// ---------------------------------------------------------------------------

export interface UpdateLeadPayload {
  id: string
  name?: string
  company?: string
  email?: string
  phone?: string
  website?: string
  dealValue?: number
  priority?: "high" | "medium" | "low"
  source?: string
  tags?: string[]
}

export function useUpdatePipelineLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateLeadPayload) => {
      const supabase = createClient()

      const { data: current } = await supabase
        .from("pipeline_leads")
        .select("metadata")
        .eq("id", payload.id)
        .single()

      const meta = current?.metadata ?? {}
      const merged: Record<string, unknown> = {
        ...meta,
        ...(payload.dealValue !== undefined && { deal_value: payload.dealValue }),
        ...(payload.priority !== undefined && { priority: payload.priority }),
        ...(payload.source !== undefined && { source: payload.source }),
      }

      const updateData: Record<string, unknown> = {
        metadata: merged,
        updated_at: new Date().toISOString(),
      }
      if (payload.name !== undefined) updateData.name = payload.name
      if (payload.company !== undefined) updateData.company_name = payload.company
      if (payload.email !== undefined) updateData.email = payload.email || null
      if (payload.phone !== undefined) updateData.phone = payload.phone || null
      if (payload.website !== undefined) updateData.website = payload.website || null
      if (payload.tags !== undefined) updateData.tags = payload.tags

      const { error } = await supabase
        .from("pipeline_leads")
        .update(updateData)
        .eq("id", payload.id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.stages() })
    },
  })
}

// ---------------------------------------------------------------------------
// Archive lead (soft delete)
// ---------------------------------------------------------------------------

export function useArchivePipelineLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leadId: string) => {
      const supabase = createClient()

      const { data: current } = await supabase
        .from("pipeline_leads")
        .select("metadata")
        .eq("id", leadId)
        .single()

      const merged = { ...(current?.metadata ?? {}), archived: true }

      const { error } = await supabase
        .from("pipeline_leads")
        .update({ metadata: merged, updated_at: new Date().toISOString() })
        .eq("id", leadId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.stages() })
    },
  })
}

// ---------------------------------------------------------------------------
// Create lead
// ---------------------------------------------------------------------------

/** Create a new pipeline lead (client record). */
export interface CreateLeadPayload {
  name: string
  company: string
  email?: string
  phone?: string
  website?: string
  dealValue?: number
  priority?: "high" | "medium" | "low"
  tags?: string[]
  source?: string
  stageId?: string
}

export function useCreatePipelineLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateLeadPayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("pipeline_leads")
        .insert({
          tenant_id: user.id,
          name: payload.name,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          company_name: payload.company ?? null,
          website: payload.website ?? null,
          tags: payload.tags ?? [],
          metadata: {
            pipeline_stage: payload.stageId ?? "inquiry",
            deal_value: payload.dealValue ?? 0,
            priority: payload.priority ?? "medium",
            source: payload.source ?? "Manual Entry",
            ai_priority: null,
            last_action_at: new Date().toISOString(),
            enrichment: { company_size: "Unknown", industry: "Unknown", confidence: 0 },
          },
        })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.stages() })
    },
  })
}
