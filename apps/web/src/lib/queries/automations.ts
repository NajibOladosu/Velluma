/**
 * TanStack Query hooks for Automations.
 *
 * Data strategy: `automation_rules` is queried directly. RLS policy
 * "Tenants can manage their own automation rules" enforces tenant isolation.
 * Creates/updates route through Supabase directly since no extra business
 * logic is needed (the automation *dispatcher* runs server-side in the
 * automation microservice).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type  (matches `automation_rules` table)
// ---------------------------------------------------------------------------

export interface AutomationRuleRow {
  id: string
  tenant_id: string
  name: string
  trigger: string
  action: string
  conditions: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// UI-facing type
// ---------------------------------------------------------------------------

export interface Automation {
  id: string
  name: string
  description: string
  trigger: string
  action: string
  enabled: boolean
  runs: number
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const automationKeys = {
  all: ["automations"] as const,
  lists: () => [...automationKeys.all, "list"] as const,
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapRowToAutomation(row: AutomationRuleRow): Automation {
  const meta = row.conditions as Record<string, unknown>
  return {
    id: row.id,
    name: row.name,
    description: (meta.description as string) ?? "",
    trigger: row.trigger,
    action: row.action,
    enabled: row.is_active,
    runs: (meta.run_count as number) ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all automation rules for the current tenant. */
export function useAutomations() {
  return useQuery({
    queryKey: automationKeys.lists(),
    queryFn: async (): Promise<Automation[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return ((data ?? []) as AutomationRuleRow[]).map(mapRowToAutomation)
    },
  })
}

/** Toggle an automation rule's enabled/disabled state. */
export function useToggleAutomation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("automation_rules")
        .update({ is_active: enabled })
        .eq("id", id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as AutomationRuleRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() })
    },
  })
}

/** Create a new automation rule. */
export interface CreateAutomationPayload {
  name: string
  trigger: string
  action: string
  description?: string
  tenantId: string
}

export function useCreateAutomation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateAutomationPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("automation_rules")
        .insert([
          {
            tenant_id: payload.tenantId,
            name: payload.name,
            trigger: payload.trigger,
            action: payload.action,
            conditions: { description: payload.description ?? "" },
            is_active: true,
          },
        ])
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as AutomationRuleRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() })
    },
  })
}

/**
 * Update an automation rule's fields.
 * When `description` is provided the existing conditions are fetched first to
 * preserve the `run_count` bookkeeping field stored alongside it.
 */
export interface UpdateAutomationPayload {
  id: string
  name?: string
  trigger?: string
  action?: string
  description?: string
  isActive?: boolean
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateAutomationPayload) => {
      const supabase = createClient()

      // Fetch current conditions so run_count is preserved when description changes
      const { data: current, error: fetchError } = await supabase
        .from("automation_rules")
        .select("conditions")
        .eq("id", payload.id)
        .single()

      if (fetchError) throw new Error(fetchError.message)

      const prevConditions = (current?.conditions ?? {}) as Record<string, unknown>

      const { data, error } = await supabase
        .from("automation_rules")
        .update({
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.trigger !== undefined && { trigger: payload.trigger }),
          ...(payload.action !== undefined && { action: payload.action }),
          ...(payload.isActive !== undefined && { is_active: payload.isActive }),
          ...(payload.description !== undefined && {
            conditions: { ...prevConditions, description: payload.description },
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return mapRowToAutomation(data as AutomationRuleRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() })
    },
  })
}

/** Delete an automation rule. */
export function useDeleteAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() })
    },
  })
}
