/**
 * TanStack Query hooks for proposal_deliverables.
 *
 * Per §1 Proposal-as-origin: each row becomes both a contract clause line
 * AND a project task on proposal acceptance. line_total drives the auto-
 * computed Pricing total on the proposal.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export interface ProposalDeliverableRow {
  id: string
  proposal_id: string
  position: number
  title: string
  description: string | null
  service_id: string | null
  est_hours: number | null
  due_offset_days: number | null
  unit_price: number | null
  qty: number | null
  line_total: number | null
  is_optional: boolean
}

export interface ProposalDeliverable {
  id: string
  proposalId: string
  position: number
  title: string
  description: string | null
  serviceId: string | null
  estHours: number
  dueOffsetDays: number | null
  unitPrice: number
  qty: number
  lineTotal: number
  isOptional: boolean
}

function mapRow(r: ProposalDeliverableRow): ProposalDeliverable {
  const qty = Number(r.qty) || 0
  const unit = Number(r.unit_price) || 0
  return {
    id: r.id,
    proposalId: r.proposal_id,
    position: r.position ?? 0,
    title: r.title,
    description: r.description,
    serviceId: r.service_id,
    estHours: Number(r.est_hours) || 0,
    dueOffsetDays: r.due_offset_days,
    unitPrice: unit,
    qty,
    lineTotal: Number(r.line_total) || qty * unit,
    isOptional: r.is_optional ?? false,
  }
}

export const proposalDeliverableKeys = {
  all: ["proposal-deliverables"] as const,
  list: (proposalId: string) =>
    [...proposalDeliverableKeys.all, proposalId] as const,
}

export function useProposalDeliverables(proposalId: string) {
  return useQuery({
    queryKey: proposalDeliverableKeys.list(proposalId),
    queryFn: async (): Promise<ProposalDeliverable[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("proposal_deliverables")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
      if (error) throw new Error(error.message)
      return ((data ?? []) as ProposalDeliverableRow[]).map(mapRow)
    },
    enabled: Boolean(proposalId),
  })
}

export interface CreateProposalDeliverablePayload {
  proposalId: string
  title: string
  description?: string
  serviceId?: string | null
  unitPrice?: number
  qty?: number
  estHours?: number
  dueOffsetDays?: number | null
  isOptional?: boolean
  position?: number
}

export function useCreateProposalDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: CreateProposalDeliverablePayload) => {
      const supabase = createClient()
      const qty = p.qty ?? 1
      const unit = p.unitPrice ?? 0
      const { data, error } = await supabase
        .from("proposal_deliverables")
        .insert({
          proposal_id: p.proposalId,
          position: p.position ?? 0,
          title: p.title,
          description: p.description ?? null,
          service_id: p.serviceId ?? null,
          unit_price: unit,
          qty,
          line_total: qty * unit,
          est_hours: p.estHours ?? null,
          due_offset_days: p.dueOffsetDays ?? null,
          is_optional: p.isOptional ?? false,
        })
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRow(data as ProposalDeliverableRow)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: proposalDeliverableKeys.list(vars.proposalId) })
    },
  })
}

export interface UpdateProposalDeliverablePayload {
  id: string
  proposalId: string
  title?: string
  description?: string | null
  unitPrice?: number
  qty?: number
  estHours?: number
  dueOffsetDays?: number | null
  isOptional?: boolean
  position?: number
}

export function useUpdateProposalDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: UpdateProposalDeliverablePayload) => {
      const supabase = createClient()
      const patch: Record<string, unknown> = {}
      if (p.title !== undefined)         patch.title = p.title
      if (p.description !== undefined)   patch.description = p.description
      if (p.unitPrice !== undefined)     patch.unit_price = p.unitPrice
      if (p.qty !== undefined)           patch.qty = p.qty
      if (p.estHours !== undefined)      patch.est_hours = p.estHours
      if (p.dueOffsetDays !== undefined) patch.due_offset_days = p.dueOffsetDays
      if (p.isOptional !== undefined)    patch.is_optional = p.isOptional
      if (p.position !== undefined)      patch.position = p.position
      // Recompute line_total when qty or unit_price changed
      if (patch.qty !== undefined || patch.unit_price !== undefined) {
        const { data: cur } = await supabase
          .from("proposal_deliverables")
          .select("qty, unit_price")
          .eq("id", p.id)
          .single<{ qty: number; unit_price: number }>()
        const qty = (patch.qty as number | undefined) ?? Number(cur?.qty) ?? 0
        const unit = (patch.unit_price as number | undefined) ?? Number(cur?.unit_price) ?? 0
        patch.line_total = qty * unit
      }
      const { data, error } = await supabase
        .from("proposal_deliverables")
        .update(patch)
        .eq("id", p.id)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRow(data as ProposalDeliverableRow)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: proposalDeliverableKeys.list(vars.proposalId) })
    },
  })
}

export function useDeleteProposalDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; proposalId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("proposal_deliverables")
        .delete()
        .eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: proposalDeliverableKeys.list(vars.proposalId) })
    },
  })
}
