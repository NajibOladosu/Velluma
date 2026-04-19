"use client"

import * as React from "react"
import {
  Plus, Loader2, X, Sparkles, Trash2, Edit2, ExternalLink, Copy, Check,
  GripVertical, Eye, EyeOff, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { Badge } from "@/components/ui/badge"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useLeadForms, useUpsertLeadForm, useDeleteLeadForm,
  type LeadForm, type FormField, type FieldType,
} from "@/lib/queries/lead-forms"
import { cn } from "@/lib/utils"

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48)
}

export default function LeadFormsPage() {
  const { data: forms = [], isLoading } = useLeadForms()
  const [editing, setEditing] = React.useState<LeadForm | "new" | null>(null)

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <H1 className="text-2xl font-medium">Lead Forms</H1>
          <Muted className="text-sm">Public forms prospects fill to land directly in your pipeline.</Muted>
        </div>
        <Button size="sm" className="h-9 gap-2 shrink-0" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New form
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
      ) : forms.length === 0 ? (
        <Surface className="p-16 text-center">
          <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-zinc-400" strokeWidth={1.5} />
          </div>
          <P className="font-medium text-zinc-900">No lead forms yet</P>
          <Muted className="text-sm mt-1">Create a public form and share the URL — submissions appear in your pipeline.</Muted>
          <Button size="sm" className="h-9 gap-2 mt-4" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Create your first form
          </Button>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((f) => <FormCard key={f.id} form={f} onEdit={() => setEditing(f)} />)}
        </div>
      )}

      {editing && <FormModal form={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function FormCard({ form, onEdit }: { form: LeadForm; onEdit: () => void }) {
  const del = useDeleteLeadForm()
  const upsert = useUpsertLeadForm()
  const [copied, setCopied] = React.useState(false)
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/f/${form.slug}` : `/f/${form.slug}`

  return (
    <Surface className="p-5 flex flex-col gap-3 group transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <P className="text-sm font-medium truncate">{form.title}</P>
          <Muted className="text-xs font-mono truncate block">/f/{form.slug}</Muted>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button type="button" onClick={onEdit} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors" title="Edit">
            <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => { if (confirm(`Delete "${form.title}"?`)) del.mutate(form.id) }} className="p-1 text-zinc-400 hover:text-red-600" title="Delete">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {form.intro && <Muted className="text-xs line-clamp-2 leading-relaxed">{form.intro}</Muted>}

      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-auto">
        <span>{form.fields.length} field{form.fields.length !== 1 && "s"}</span>
        <span className="text-zinc-300">·</span>
        <Badge
          variant={form.is_published ? "emerald" : "outline"}
          className="text-[10px] uppercase tracking-wide cursor-pointer"
          onClick={() => upsert.mutate({ id: form.id, slug: form.slug, is_published: !form.is_published })}
        >
          {form.is_published ? <><Eye className="h-3 w-3 mr-1" /> Published</> : <><EyeOff className="h-3 w-3 mr-1" /> Draft</>}
        </Badge>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
        <Button
          variant="outline" size="sm" className="h-8 flex-1"
          onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        >
          {copied ? <Check className="h-3 w-3 mr-1.5" strokeWidth={2} /> : <Copy className="h-3 w-3 mr-1.5" strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy URL"}
        </Button>
        <Button variant="outline" size="sm" className="h-8" asChild>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          </a>
        </Button>
      </div>
    </Surface>
  )
}

function FormModal({ form, onClose }: { form: LeadForm | null; onClose: () => void }) {
  const upsert = useUpsertLeadForm()
  const isEdit = form !== null

  const [slug, setSlug] = React.useState(form?.slug ?? "")
  const [title, setTitle] = React.useState(form?.title ?? "Work with me")
  const [intro, setIntro] = React.useState(form?.intro ?? "")
  const [thankYou, setThankYou] = React.useState(form?.thank_you ?? "Thanks — I'll be in touch shortly.")
  const [fields, setFields] = React.useState<FormField[]>(form?.fields ?? [
    { id: "name", label: "Your name", type: "text", required: true },
    { id: "email", label: "Email", type: "email", required: true },
    { id: "project", label: "Tell me about your project", type: "textarea", required: true },
  ])
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!slug.trim()) { setError("Slug is required"); return }
    // Ensure required name+email are present
    const hasName = fields.some((f) => f.id === "name")
    const hasEmail = fields.some((f) => f.id === "email")
    if (!hasName || !hasEmail) { setError("Form must include 'name' and 'email' fields"); return }
    try {
      await upsert.mutateAsync({
        id: form?.id,
        slug: slugify(slug),
        title: title.trim(),
        intro: intro.trim() || null,
        thank_you: thankYou.trim() || null,
        fields,
        is_published: true,
      })
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save") }
  }

  function updateField(idx: number, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }
  function addField() {
    const id = `field_${Math.random().toString(36).slice(2, 7)}`
    setFields((prev) => [...prev, { id, label: "New field", type: "text" }])
  }
  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={() => !upsert.isPending && onClose()} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <H3 className="text-base">{isEdit ? "Edit form" : "New form"}</H3>
            <Muted className="text-xs">Build your public lead capture form.</Muted>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="URL slug" hint={slug ? `/f/${slug}` : "your-slug"}>
              <input required type="text" value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="work-with-me"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
            </Field>
            <Field label="Title">
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
            </Field>
          </div>
          <Field label="Intro (optional)">
            <textarea value={intro} rows={2} onChange={(e) => setIntro(e.target.value)}
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>
          <Field label="Thank-you message" hint="Shown after successful submission">
            <input type="text" value={thankYou} onChange={(e) => setThankYou(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <P className="text-sm font-medium">Fields</P>
                <Muted className="text-xs">Must include fields with id &quot;name&quot; and &quot;email&quot;.</Muted>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={addField}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add field
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-md border border-zinc-200 group">
                  <GripVertical className="h-4 w-4 text-zinc-300 mt-2 shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <input
                      type="text" value={field.id}
                      onChange={(e) => updateField(idx, { id: e.target.value.replace(/\s/g, "_") })}
                      placeholder="field_id"
                      className="col-span-3 h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    />
                    <input
                      type="text" value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Label"
                      className="col-span-5 h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}
                      className="col-span-3 h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="textarea">Long text</option>
                      <option value="select">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                    <label className="col-span-1 flex items-center justify-center cursor-pointer" title="Required">
                      <input type="checkbox" checked={field.required ?? false}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
                    </label>
                    {field.type === "select" && (
                      <input
                        type="text"
                        value={(field.options ?? []).join(", ")}
                        onChange={(e) => updateField(idx, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                        placeholder="Option A, Option B, Option C"
                        className="col-span-12 h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                      />
                    )}
                  </div>
                  <button
                    type="button" onClick={() => removeField(idx)}
                    className="mt-1.5 p-1 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Delete field"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={upsert.isPending}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9" disabled={upsert.isPending || !slug.trim()}>
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {isEdit ? "Save changes" : "Create form"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5 min-w-0", className)}>
      <label className="block text-xs font-medium text-zinc-700">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-500 truncate">{hint}</p>}
    </div>
  )
}
