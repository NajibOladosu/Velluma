"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export type FieldType = "text" | "email" | "tel" | "textarea" | "select" | "checkbox"

export interface FormField {
  id: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  placeholder?: string
}

export interface LeadForm {
  id: string
  user_id: string
  slug: string
  title: string
  intro: string | null
  thank_you: string | null
  is_published: boolean
  fields: FormField[]
  created_at: string
}

export const leadFormKeys = {
  all: ["lead-forms"] as const,
  list: () => [...leadFormKeys.all, "list"] as const,
}

export function useLeadForms() {
  return useQuery({
    queryKey: leadFormKeys.list(),
    queryFn: async (): Promise<LeadForm[]> => {
      const supabase = createClient()
      const { data, error } = await supabase.from("lead_forms").select("*").order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as LeadForm[]
    },
  })
}

export function useUpsertLeadForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<LeadForm> & { slug: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      if (patch.id) {
        const { error } = await supabase.from("lead_forms").update({
          slug: patch.slug, title: patch.title, intro: patch.intro,
          thank_you: patch.thank_you, is_published: patch.is_published,
          fields: patch.fields, updated_at: new Date().toISOString(),
        }).eq("id", patch.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from("lead_forms").insert({
          user_id: user.id,
          slug: patch.slug, title: patch.title ?? "Work with me",
          intro: patch.intro, thank_you: patch.thank_you, fields: patch.fields,
          is_published: patch.is_published ?? true,
        })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadFormKeys.list() }),
  })
}

export function useDeleteLeadForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from("lead_forms").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadFormKeys.list() }),
  })
}
