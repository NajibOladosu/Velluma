"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { CheckCircle2, Loader2, AlertCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"

type FieldType = "text" | "email" | "tel" | "textarea" | "select" | "checkbox"
interface FormField { id: string; label: string; type: FieldType; required?: boolean; options?: string[]; placeholder?: string }
interface FormDef { id: string; slug: string; title: string; intro: string | null; thank_you: string | null; fields: FormField[] }

export default function PublicLeadFormPage() {
  const params = useParams()
  const slug = (params?.slug as string) ?? ""

  const { data: form, isLoading } = useQuery({
    queryKey: ["lead-form", slug],
    queryFn: async (): Promise<FormDef | null> => {
      const res = await fetch(`/api/f/${slug}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const [values, setValues] = React.useState<Record<string, unknown>>({})
  const [done, setDone] = React.useState(false)

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/f/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      return res.json() as Promise<{ thankYou: string }>
    },
    onSuccess: () => setDone(true),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Surface className="p-10 max-w-md text-center space-y-3">
          <H3 className="text-base">Form not found</H3>
          <Muted className="text-sm">This link may have been removed or unpublished.</Muted>
        </Surface>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Surface className="p-10 max-w-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="h-14 w-14 rounded-md bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />
          </div>
          <H3 className="text-lg">Thanks!</H3>
          <P className="text-sm text-zinc-600">{form.thank_you ?? "I'll be in touch shortly."}</P>
        </Surface>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-zinc-900 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <H1 className="text-xl truncate">{form.title}</H1>
            {form.intro && <Muted className="text-sm block">{form.intro}</Muted>}
          </div>
        </div>

        <Surface className="p-6">
          <form
            onSubmit={(e) => { e.preventDefault(); submit.mutate() }}
            className="space-y-4"
          >
            {form.fields.map((f) => {
              const v = values[f.id] ?? ""
              const setV = (val: unknown) => setValues((p) => ({ ...p, [f.id]: val }))
              const common = "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"

              return (
                <div key={f.id} className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-700">
                    {f.label}{f.required && <span className="text-zinc-400"> *</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      required={f.required} rows={4}
                      value={v as string} onChange={(e) => setV(e.target.value)}
                      placeholder={f.placeholder}
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    />
                  ) : f.type === "select" ? (
                    <select required={f.required} value={v as string} onChange={(e) => setV(e.target.value)} className={common}>
                      <option value="">Select…</option>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === "checkbox" ? (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={Boolean(v)} onChange={(e) => setV(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
                      <span className="text-sm text-zinc-700">{f.placeholder ?? "Yes"}</span>
                    </label>
                  ) : (
                    <input
                      required={f.required} type={f.type}
                      value={v as string} onChange={(e) => setV(e.target.value)}
                      placeholder={f.placeholder}
                      className={common}
                    />
                  )}
                </div>
              )
            })}

            {submit.isError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                {submit.error instanceof Error ? submit.error.message : "Could not submit. Try again."}
              </div>
            )}

            <Button type="submit" className="w-full h-10" disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </form>
        </Surface>
      </div>
    </div>
  )
}
