import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type TemplateCategory = "proposal" | "contract" | "invoice" | "email" | "brief" | "other"

export interface DocumentTemplate {
  id: string
  name: string
  description: string | null
  category: TemplateCategory
  content: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export const templateKeys = {
  all: ["templates"] as const,
  list: (category?: string) => [...templateKeys.all, "list", category ?? null] as const,
}

export function useTemplates(category?: TemplateCategory) {
  return useQuery({
    queryKey: templateKeys.list(category),
    queryFn: async () => {
      const qs = category ? `?category=${category}` : ""
      const res = await fetch(`/api/templates${qs}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load templates")
      return ((await res.json()).templates ?? []) as DocumentTemplate[]
    },
    staleTime: 30_000,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      description?: string
      category: TemplateCategory
      content: Record<string, unknown>
    }) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create")
      return (await res.json()) as DocumentTemplate
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<DocumentTemplate>) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
        credentials: "include",
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update")
      return (await res.json()) as DocumentTemplate
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Failed to delete")
      return true
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  })
}
