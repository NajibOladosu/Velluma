"use client"

import { useState } from "react"
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
import { Surface } from "@/components/ui/surface"
import { H1, H3, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  type DocumentTemplate,
  type TemplateCategory,
} from "@/lib/queries/templates"
import { Plus, Trash2, Pencil, X, Save } from "lucide-react"

const CATEGORIES: TemplateCategory[] = ["proposal", "contract", "invoice", "email", "brief", "other"]

export default function TemplatesPage() {
  const [category, setCategory] = useState<TemplateCategory | "all">("all")
  const [editing, setEditing] = useState<DocumentTemplate | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: templates, isLoading } = useTemplates(category === "all" ? undefined : category)
  const remove = useDeleteTemplate()

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <H1>Templates</H1>
          <Muted>Reusable content blocks. Drop them into proposals, contracts, emails.</Muted>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
          New template
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === "all" ? "default" : "outline"}
          onClick={() => setCategory("all")}
        >
          All
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <Surface className="p-12 text-center">
          <Muted>No templates yet. Create your first one.</Muted>
        </Surface>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Surface key={t.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <H3 className="text-sm truncate">{t.name}</H3>
                  <Muted className="text-xs line-clamp-2 mt-1">{t.description || "—"}</Muted>
                </div>
                <Badge variant="outline">{t.category}</Badge>
              </div>
              <div className="text-xs text-zinc-400">
                Updated {fmtDate(new Date(t.updated_at))}
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-zinc-100">
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-600" strokeWidth={1.5} />
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TemplateDialog
          template={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function TemplateDialog({ template, onClose }: { template: DocumentTemplate | null; onClose: () => void }) {
  const create = useCreateTemplate()
  const update = useUpdateTemplate()

  const [name, setName] = useState(template?.name ?? "")
  const [description, setDescription] = useState(template?.description ?? "")
  const [category, setCategory] = useState<TemplateCategory>((template?.category as TemplateCategory) ?? "proposal")
  const [body, setBody] = useState(
    typeof template?.content === "object" && template?.content && "body" in template.content
      ? String((template.content as Record<string, unknown>).body ?? "")
      : "",
  )

  const busy = create.isPending || update.isPending

  const handleSave = async () => {
    if (!name.trim()) return
    const content = { body }
    if (template) {
      await update.mutateAsync({ id: template.id, name, description, category, content })
    } else {
      await create.mutateAsync({ name, description, category, content })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <H3>{template ? "Edit template" : "New template"}</H3>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-900">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Discovery proposal" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Content</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Paste your reusable content here — markdown or plain text."
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-200">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy || !name.trim()}>
            <Save className="h-4 w-4 mr-2" strokeWidth={1.5} />
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
