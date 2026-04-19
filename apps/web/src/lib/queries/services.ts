/**
 * TanStack Query hooks for the services catalog (rate cards).
 * RLS: each row is owner-scoped via user_id = auth.uid().
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export type ServiceUnit = "flat" | "hour" | "day" | "word" | "project" | "recurring"

export interface ServiceRow {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string | null
  price: number
  currency: string
  unit: ServiceUnit
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  category: string | null
  price: number
  currency: string
  unit: ServiceUnit
  isActive: boolean
}

export const serviceKeys = {
  all: ["services"] as const,
  list: () => [...serviceKeys.all, "list"] as const,
}

function mapRow(r: ServiceRow): Service {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    price: Number(r.price) || 0,
    currency: r.currency || "USD",
    unit: r.unit,
    isActive: r.is_active,
  }
}

export function useServices() {
  return useQuery({
    queryKey: serviceKeys.list(),
    queryFn: async (): Promise<Service[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(mapRow)
    },
  })
}

export interface ServicePayload {
  name: string
  description?: string | null
  category?: string | null
  price: number
  currency?: string
  unit?: ServiceUnit
  isActive?: boolean
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ServicePayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("services")
        .insert({
          user_id: user.id,
          name: payload.name.trim(),
          description: payload.description ?? null,
          category: payload.category ?? null,
          price: payload.price,
          currency: payload.currency ?? "USD",
          unit: payload.unit ?? "flat",
          is_active: payload.isActive ?? true,
        })
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRow(data as ServiceRow)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.list() }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ServicePayload>) => {
      const supabase = createClient()
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if ("name" in patch) updateData.name = patch.name
      if ("description" in patch) updateData.description = patch.description
      if ("category" in patch) updateData.category = patch.category
      if ("price" in patch) updateData.price = patch.price
      if ("currency" in patch) updateData.currency = patch.currency
      if ("unit" in patch) updateData.unit = patch.unit
      if ("isActive" in patch) updateData.is_active = patch.isActive
      const { data, error } = await supabase.from("services").update(updateData).eq("id", id).select("*").single()
      if (error) throw new Error(error.message)
      return mapRow(data as ServiceRow)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.list() }),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from("services").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.list() }),
  })
}
