/**
 * TanStack Query hooks for contract milestones (freelancer side).
 *
 * Source: public.milestones, linked to contracts via contract_id.
 * The portal has its own usePortalMilestones() for the client view.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MilestoneStatus =
  | "upcoming"
  | "ready"
  | "invoiced"
  | "paid"
  | "pending" // legacy
  | "in_progress" // legacy
  | "completed" // legacy
  | "disputed" // legacy

export type MilestoneDueTrigger = "manual" | "date" | "task_completed"

export interface MilestoneRow {
  id: string
  contract_id: string
  tenant_id: string | null
  title: string
  description: string | null
  amount: number
  status: MilestoneStatus
  position: number
  due_date: string | null
  due_trigger: MilestoneDueTrigger
  dependent_task_id: string | null
  invoice_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  proposal_milestone_id: string | null
}

export interface Milestone {
  id: string
  contractId: string
  title: string
  description: string | null
  amount: number
  status: MilestoneStatus
  position: number
  dueDate: string | null
  dueTrigger: MilestoneDueTrigger
  dependentTaskId: string | null
  invoiceId: string | null
  completedAt: string | null
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export const milestoneKeys = {
  all: ["milestones"] as const,
  byContract: (contractId: string) => [...milestoneKeys.all, "contract", contractId] as const,
  byProject:  (projectId: string)  => [...milestoneKeys.all, "project",  projectId]  as const,
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapRow(r: MilestoneRow): Milestone {
  return {
    id: r.id,
    contractId: r.contract_id,
    title: r.title,
    description: r.description,
    amount: Number(r.amount) || 0,
    status: r.status,
    position: r.position ?? 0,
    dueDate: r.due_date,
    dueTrigger: r.due_trigger,
    dependentTaskId: r.dependent_task_id,
    invoiceId: r.invoice_id,
    completedAt: r.completed_at,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Milestones for a single contract, ordered by position. */
export function useContractMilestones(contractId: string) {
  return useQuery({
    queryKey: milestoneKeys.byContract(contractId),
    queryFn: async (): Promise<Milestone[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("contract_id", contractId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
      if (error) throw new Error(error.message)
      return ((data ?? []) as MilestoneRow[]).map(mapRow)
    },
    enabled: Boolean(contractId),
  })
}

/** Milestones for every contract on a project. Used by the project Billing tab. */
export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: milestoneKeys.byProject(projectId),
    queryFn: async (): Promise<Milestone[]> => {
      const supabase = createClient()
      // Pull contract IDs for the project first (RLS-enforced), then
      // milestones for those contracts.
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id")
        .eq("project_id", projectId)
      const contractIds = (contracts ?? []).map((c) => c.id as string)
      if (contractIds.length === 0) return []
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .in("contract_id", contractIds)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
      if (error) throw new Error(error.message)
      return ((data ?? []) as MilestoneRow[]).map(mapRow)
    },
    enabled: Boolean(projectId),
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface CreateMilestonePayload {
  contractId: string
  title: string
  description?: string
  amount: number
  position?: number
  dueDate?: string | null
  dueTrigger?: MilestoneDueTrigger
  dependentTaskId?: string | null
}

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: CreateMilestonePayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("milestones")
        .insert({
          contract_id: p.contractId,
          tenant_id: user.id,
          title: p.title,
          description: p.description ?? null,
          amount: p.amount,
          status: "upcoming",
          position: p.position ?? 0,
          due_date: p.dueDate ?? null,
          due_trigger: p.dueTrigger ?? "manual",
          dependent_task_id: p.dependentTaskId ?? null,
        })
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRow(data as MilestoneRow)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.byContract(vars.contractId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.all })
    },
  })
}

export interface UpdateMilestonePayload {
  id: string
  contractId: string
  title?: string
  description?: string | null
  amount?: number
  status?: MilestoneStatus
  position?: number
  dueDate?: string | null
  dueTrigger?: MilestoneDueTrigger
  dependentTaskId?: string | null
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: UpdateMilestonePayload) => {
      const supabase = createClient()
      const patch: Record<string, unknown> = {}
      if (p.title !== undefined)          patch.title = p.title
      if (p.description !== undefined)    patch.description = p.description
      if (p.amount !== undefined)         patch.amount = p.amount
      if (p.status !== undefined)         patch.status = p.status
      if (p.position !== undefined)       patch.position = p.position
      if (p.dueDate !== undefined)        patch.due_date = p.dueDate
      if (p.dueTrigger !== undefined)     patch.due_trigger = p.dueTrigger
      if (p.dependentTaskId !== undefined) patch.dependent_task_id = p.dependentTaskId
      const { data, error } = await supabase
        .from("milestones").update(patch).eq("id", p.id).select("*").single()
      if (error) throw new Error(error.message)
      return mapRow(data as MilestoneRow)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.byContract(vars.contractId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.all })
    },
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; contractId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from("milestones").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.byContract(vars.contractId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.all })
    },
  })
}

/**
 * Generate an invoice (contract_payments row) from a milestone. Calls the
 * SECURITY DEFINER fn generate_milestone_invoice(p_milestone_id) which:
 *   - creates a contract_payments row prefilled with the milestone amount
 *   - links milestone → invoice via invoice_id
 *   - flips milestone.status to 'invoiced'
 *
 * Idempotent: returns the existing invoice_id when already generated.
 */
export interface GenerateMilestoneInvoiceResult {
  invoiceId: string
}

export function useGenerateMilestoneInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ milestoneId }: { milestoneId: string; contractId: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc("generate_milestone_invoice", {
        p_milestone_id: milestoneId,
      })
      if (error) throw new Error(error.message)
      return { invoiceId: data as string } as GenerateMilestoneInvoiceResult
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.byContract(vars.contractId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.all })
      qc.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}
