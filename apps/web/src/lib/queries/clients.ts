/**
 * TanStack Query hooks for the Clients CRM.
 *
 * Data strategy: query Supabase directly from the browser client using
 * the authenticated session cookie. RLS policies on `crm_clients` ensure
 * users can only read rows where tenant_id = auth.uid().
 *
 * metadata JSONB keys:
 *   status:              "active" | "lead" | "past"
 *   total_revenue:       number
 *   source:              string
 *   enrichment:          { company_size, industry, confidence, linkedin, twitter }
 *   notes:               string[]
 *   secondary_contacts:  { name, role, email, portal_access }[]
 *   custom_fields:       { label, value, type }[]
 *   timeline:            { action, time, type }[]
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------
export interface ClientRow {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  website: string | null
  linkedin_profile: string | null
  health_score: number | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------
export interface CreateClientPayload {
  name: string
  email?: string
  phone?: string
  company_name?: string
  website?: string
  tags?: string[]
  status?: "active" | "lead" | "past"
  source?: string
}

export interface UpdateClientPayload {
  id: string
  name?: string
  email?: string
  phone?: string
  company_name?: string
  website?: string
  linkedin_profile?: string
  tags?: string[]
  health_score?: number
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------
export const clientKeys = {
  all:    ["clients"] as const,
  lists:  () => [...clientKeys.all, "list"] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all clients for the current user's tenant. */
export function useClients() {
  return useQuery({
    queryKey: clientKeys.lists(),
    queryFn: async (): Promise<ClientRow[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("crm_clients")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as ClientRow[]
    },
  })
}

/** Fetch a single client by ID. */
export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async (): Promise<ClientRow> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("crm_clients")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    enabled: Boolean(id),
  })
}

/** Create a new client. tenant_id = auth.uid() (profiles.id = auth.uid()). */
export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("crm_clients")
        .insert({
          tenant_id: user.id,
          name: payload.name,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          company_name: payload.company_name ?? null,
          website: payload.website ?? null,
          tags: payload.tags ?? [],
          metadata: {
            status: payload.status ?? "lead",
            total_revenue: 0,
            source: payload.source ?? "Manual Entry",
            enrichment: { company_size: "Unknown", industry: "Unknown", confidence: 0 },
            notes: [],
            secondary_contacts: [],
            custom_fields: [],
            timeline: [],
          },
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

/** Update top-level fields on a client. */
export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateClientPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("crm_clients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

/** Patch a subset of metadata keys (merges with existing metadata). */
export function useUpdateClientMeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, metaPatch }: { id: string; metaPatch: Record<string, unknown> }) => {
      const supabase = createClient()

      const { data: current } = await supabase
        .from("crm_clients")
        .select("metadata")
        .eq("id", id)
        .single()

      const merged = { ...(current?.metadata ?? {}), ...metaPatch }

      const { data, error } = await supabase
        .from("crm_clients")
        .update({ metadata: merged, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

/** Delete a client record. */
export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("crm_clients")
        .delete()
        .eq("id", id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}
