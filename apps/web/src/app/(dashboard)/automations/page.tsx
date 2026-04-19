"use client";

import * as React from "react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Zap, Plus, Clock, ChevronRight, ToggleLeft, ToggleRight, Repeat,
  X, Loader2, AlertCircle, Mail, Bell, FileText, CheckCircle2, Receipt,
  Trash2, Edit2, Send, UserPlus, CalendarClock, Building2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  useAutomations, useToggleAutomation, useCreateAutomation, useUpdateAutomation, useDeleteAutomation,
  type Automation,
} from "@/lib/queries/automations";

/* ── Trigger & action catalogs ─────────────────────────────── */

interface TriggerDef { id: string; label: string; description: string; icon: React.ElementType }
interface ActionDef  { id: string; label: string; description: string; icon: React.ElementType; requiresBody?: boolean }

const TRIGGERS: TriggerDef[] = [
  { id: "proposal.sent",     label: "Proposal sent",    description: "When you send a proposal to a client",         icon: FileText        },
  { id: "proposal.accepted", label: "Proposal accepted", description: "When a client accepts a proposal",             icon: CheckCircle2    },
  { id: "contract.signed",   label: "Contract signed",   description: "When both parties have signed a contract",     icon: CheckCircle2    },
  { id: "invoice.paid",      label: "Invoice paid",      description: "When a client pays an invoice",                icon: Receipt         },
  { id: "milestone.completed", label: "Milestone completed", description: "When a milestone is marked complete",     icon: CheckCircle2    },
  { id: "booking.created",   label: "Booking created",   description: "When a prospect books a meeting",              icon: CalendarClock   },
  { id: "lead.captured",     label: "Lead captured",     description: "When someone submits a lead form",             icon: UserPlus        },
  { id: "project.completed", label: "Project completed", description: "When a project is marked complete",            icon: Building2       },
  { id: "date.recurring",    label: "On a schedule",     description: "Daily / weekly / monthly at a time you pick",  icon: Clock           },
]

const ACTIONS: ActionDef[] = [
  { id: "email.send",         label: "Send email",          description: "Send a templated email", icon: Mail, requiresBody: true },
  { id: "notification.push",  label: "Push notification",   description: "In-app notification to you", icon: Bell },
  { id: "invoice.create",     label: "Create invoice",      description: "Generate an invoice from a template", icon: Receipt },
  { id: "task.create",        label: "Create task",         description: "Add a task to the active project", icon: FileText },
  { id: "reminder.client",    label: "Remind the client",   description: "Email reminder to the client", icon: Send, requiresBody: true },
]

const TEMPLATES: Array<{ name: string; description: string; trigger: string; action: string; body?: string }> = [
  {
    name: "Follow up after proposal sent",
    description: "Nudge the client 3 days after you send a proposal.",
    trigger: "proposal.sent",
    action: "reminder.client",
    body: "Just checking in — any questions about the proposal? Happy to jump on a quick call.",
  },
  {
    name: "Thank client on invoice paid",
    description: "Send a thank-you email when a client pays an invoice.",
    trigger: "invoice.paid",
    action: "email.send",
    body: "Thanks for the prompt payment — it means a lot. Looking forward to wrapping up the next milestone.",
  },
  {
    name: "Notify me on new lead",
    description: "Push a notification when a new lead submits a form.",
    trigger: "lead.captured",
    action: "notification.push",
  },
]

function findTrigger(id: string): TriggerDef | undefined { return TRIGGERS.find((t) => t.id === id) }
function findAction(id: string): ActionDef | undefined { return ACTIONS.find((a) => a.id === id) }

export default function AutomationsPage() {
  const { data: items = [], isLoading } = useAutomations();
  const toggleMutation = useToggleAutomation();
  const [editing, setEditing] = React.useState<Automation | "new" | null>(null)
  const [prefill, setPrefill] = React.useState<typeof TEMPLATES[number] | null>(null)

  function toggleEnabled(id: string) {
    const current = items.find((a) => a.id === id);
    if (!current) return;
    toggleMutation.mutate({ id, enabled: !current.enabled });
  }

  const activeCount = items.filter((a) => a.enabled).length;
  const totalRuns   = items.reduce((s, a) => s + a.runs, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Automations</H1>
          <Muted className="truncate">Put your business on autopilot. Set rules once, run forever.</Muted>
        </div>
        <Button className="gap-2 font-semibold px-5 w-full sm:w-auto" onClick={() => { setPrefill(null); setEditing("new") }}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active Rules", value: `${activeCount}`, icon: Zap    },
          { label: "Total Runs",   value: `${totalRuns}`,   icon: Repeat },
          { label: "Hours Saved",  value: "~6h / mo",       icon: Clock  },
        ].map((m) => (
          <Surface key={m.label} className="p-5">
            <div className="flex items-center justify-between pb-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">{m.label}</Muted>
              <m.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">{m.value}</div>
          </Surface>
        ))}
      </div>

      {/* Active Automations */}
      <div className="space-y-3">
        <H2 className="text-base">Your Automations</H2>
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Surface key={i} className="p-5 flex items-center gap-5">
                <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-7 w-7 flex-shrink-0" />
              </Surface>
            ))
          ) : items.length === 0 ? (
            <Surface className="p-10 text-center">
              <Muted className="text-sm">No automation rules yet. Create one or pick a template below.</Muted>
            </Surface>
          ) : (
            items.map((automation) => {
              const trigger = findTrigger(automation.trigger)
              const action  = findAction(automation.action)
              const TriggerIcon = trigger?.icon ?? Zap
              const ActionIcon  = action?.icon ?? Send
              return (
                <Surface
                  key={automation.id}
                  className={cn("p-5 flex items-center gap-5 transition-colors group", !automation.enabled && "opacity-60")}
                >
                  <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-zinc-500" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 tracking-tight truncate">{automation.name}</span>
                      {automation.runs > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex-shrink-0">
                          {automation.runs} runs
                        </span>
                      )}
                    </div>
                    {automation.description && (
                      <P className="text-xs text-zinc-500 truncate">{automation.description}</P>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-white text-[10px] uppercase tracking-wide flex items-center gap-1 max-w-full">
                        <TriggerIcon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{trigger?.label ?? automation.trigger}</span>
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-zinc-300 hidden sm:block" />
                      <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-white text-[10px] uppercase tracking-wide flex items-center gap-1 max-w-full">
                        <ActionIcon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{action?.label ?? automation.action}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setEditing(automation)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button type="button" onClick={() => toggleEnabled(automation.id)}
                      className="flex-shrink-0" aria-label={automation.enabled ? "Disable" : "Enable"}>
                      {automation.enabled ? (
                        <ToggleRight className="h-7 w-7 text-zinc-900" strokeWidth={1.5} />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-zinc-300" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </Surface>
              );
            })
          )}
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        <H2 className="text-base">Popular Templates</H2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((tpl, i) => {
            const trigger = findTrigger(tpl.trigger)
            const action = findAction(tpl.action)
            const TIcon = trigger?.icon ?? Zap
            const AIcon = action?.icon ?? Send
            return (
              <Surface key={i} className="p-5 space-y-3 group">
                <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-zinc-500 group-hover:text-zinc-900 transition-colors" strokeWidth={1.5} />
                </div>
                <div className="space-y-1 min-w-0">
                  <P className="text-sm font-semibold text-zinc-900 leading-snug">{tpl.name}</P>
                  <Muted className="text-xs line-clamp-2">{tpl.description}</Muted>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <TIcon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{trigger?.label ?? tpl.trigger}</span>
                  <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                  <AIcon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{action?.label ?? tpl.action}</span>
                </div>
                <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={() => { setPrefill(tpl); setEditing("new") }}>
                  Use template
                </Button>
              </Surface>
            )
          })}
        </div>
      </div>

      {editing && (
        <AutomationModal
          automation={editing === "new" ? null : editing}
          prefill={editing === "new" ? prefill : null}
          onClose={() => { setEditing(null); setPrefill(null) }}
        />
      )}
    </div>
  );
}

/* ── Builder modal ─────────────────────────────── */

function AutomationModal({
  automation, prefill, onClose,
}: {
  automation: Automation | null;
  prefill: typeof TEMPLATES[number] | null;
  onClose: () => void;
}) {
  const create = useCreateAutomation()
  const update = useUpdateAutomation()
  const del = useDeleteAutomation()
  const isEdit = automation !== null

  const [name, setName] = React.useState(automation?.name ?? prefill?.name ?? "")
  const [description, setDescription] = React.useState(automation?.description ?? prefill?.description ?? "")
  const [trigger, setTrigger] = React.useState<string>(automation?.trigger ?? prefill?.trigger ?? TRIGGERS[0].id)
  const [action, setAction] = React.useState<string>(automation?.action ?? prefill?.action ?? ACTIONS[0].id)
  const [body, setBody] = React.useState(prefill?.body ?? "")
  const [error, setError] = React.useState<string | null>(null)

  const submitting = create.isPending || update.isPending
  const currentAction = findAction(action)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError("Name is required"); return }

    try {
      if (isEdit && automation) {
        await update.mutateAsync({
          id: automation.id,
          name: name.trim(),
          trigger,
          action,
          description: description.trim() || undefined,
        })
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")
        await create.mutateAsync({
          name: name.trim(),
          trigger, action,
          description: description.trim() || undefined,
          tenantId: user.id,
        })
      }
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Failed") }
  }

  async function handleDelete() {
    if (!automation) return
    if (!confirm(`Delete "${automation.name}"?`)) return
    await del.mutateAsync(automation.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <H3 className="text-base">{isEdit ? "Edit automation" : "New automation"}</H3>
            <Muted className="text-xs">Pick a trigger, then what should happen.</Muted>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* 1. Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Name</label>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Follow up 3 days after proposal"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </div>

          {/* 2. Trigger picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-widest">1. When this happens</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRIGGERS.map((t) => {
                const Icon = t.icon
                const active = trigger === t.id
                return (
                  <button key={t.id} type="button" onClick={() => setTrigger(t.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-md border text-left transition-colors",
                      active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                    )}>
                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500")}>
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <P className="text-sm font-medium">{t.label}</P>
                      <Muted className="text-[11px] line-clamp-1">{t.description}</Muted>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Action picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-widest">2. Do this</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTIONS.map((a) => {
                const Icon = a.icon
                const active = action === a.id
                return (
                  <button key={a.id} type="button" onClick={() => setAction(a.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-md border text-left transition-colors",
                      active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                    )}>
                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500")}>
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <P className="text-sm font-medium">{a.label}</P>
                      <Muted className="text-[11px] line-clamp-1">{a.description}</Muted>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {currentAction?.requiresBody && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Email body</label>
              <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Use {{client_name}}, {{project_title}}, {{amount}} as merge tags."
                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
              <p className="text-[11px] text-zinc-500">Tip: use <code className="bg-zinc-100 rounded px-1 py-0.5">&#123;&#123;client_name&#125;&#125;</code> as merge tags.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Description (optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What this does, for your own reference"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
            <div>
              {isEdit && (
                <Button type="button" variant="ghost" size="sm" className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleDelete} disabled={del.isPending}>
                  {del.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" size="sm" className="h-9" disabled={submitting || !name.trim()}>
                {submitting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                {isEdit ? "Save" : "Create automation"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
