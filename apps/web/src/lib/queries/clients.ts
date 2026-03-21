/**
 * TanStack Query hooks for the Clients CRM.
 *
 * Data strategy: query Supabase directly from the browser client using
 * the authenticated session cookie. RLS policies on the `clients` table
 * ensure users can only read rows belonging to their own tenant.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type (matches Supabase `clients` table)
// ---------------------------------------------------------------------------
export interface ClientRow {
  id: string
  tenant_id: string
  created_at: string
  name: string
  email: string | null
  company_name: string | null
  linkedin_profile: string | null
  health_score: number | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Insert payload
// ---------------------------------------------------------------------------
export interface CreateClientPayload {
  name: string
  email?: string
  company_name?: string
  tags?: string[]
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

/**
 * Fetch all clients for the current user's tenant.
 * The user's tenant is resolved via RLS — the `clients` table is filtered
 * to rows where `tenant_id` matches the authenticated user's tenant.
 */
export function useClients() {
  return useQuery({
    queryKey: clientKeys.lists(),
    queryFn: async (): Promise<ClientRow[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as ClientRow[]
    },
  })
}

/**
 * Fetch a single client by ID.
 */
export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async (): Promise<ClientRow> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    enabled: Boolean(id),
  })
}

/**
 * Create a new client. Invalidates the list query on success.
 */
export function useCreateClient() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      // Resolve tenant_id from the current user's profile
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.tenant_id) {
        throw new Error("Could not resolve tenant — make sure your profile is set up.")
      }

      const { data, error } = await supabase
        .from("clients")
        .insert({
          tenant_id: profile.tenant_id,
          name: payload.name,
          email: payload.email ?? null,
          company_name: payload.company_name ?? null,
          tags: payload.tags ?? [],
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
