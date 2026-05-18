"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { H1, Muted, P } from "@/components/ui/typography"
import { Surface } from "@/components/ui/surface"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { MessageThread } from "@/components/messages/message-thread"
import { MessageSquare, Inbox, User, Folder, Plus, Hash, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Inbox grouped by client, with project sub-threads.
 *
 *   Left column   : one row per crm_client
 *   Right column  : selected client's main thread + tabs for each project
 *                   sub-thread + a "+ New project thread" picker
 *
 * Each thread is `contract_conversations` keyed by
 * (tenant_id, client_id, project_id IS NULL OR = X). The schema migration
 * 20260512140000_messages_thread_by_client.sql gives us the (client_id,
 * project_id) shape. Sub-threads are created on first POST via the
 * /api/clients/[id]/messages?projectId=X route.
 */

interface ConversationRow {
  id: string
  client_id: string | null
  project_id: string | null
  subject: string | null
  last_message_at: string | null
  crm_clients: { id: string; name: string; email: string | null; company_name: string | null } | null
  projects?: { id: string; title: string | null } | null
}

interface ClientProjectRow {
  id: string
  title: string | null
  client_id: string | null
}

interface ClientGroup {
  clientId: string
  client: NonNullable<ConversationRow["crm_clients"]>
  main: ConversationRow | null
  subThreads: ConversationRow[]
  lastActivity: string | null
}

function clientLabel(c: NonNullable<ConversationRow["crm_clients"]>): string {
  return c.company_name ?? c.name ?? c.email ?? "Client"
}

export default function MessagesPage() {
  const supabase = React.useMemo(() => createClient(), [])

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["client-conversations-grouped"],
    queryFn: async (): Promise<ConversationRow[]> => {
      const { data, error } = await supabase
        .from("contract_conversations")
        .select(
          "id, client_id, project_id, subject, last_message_at, " +
            "crm_clients(id, name, email, company_name), " +
            "projects(id, title)",
        )
        .not("client_id", "is", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as ConversationRow[]
    },
    refetchInterval: 10_000,
  })

  // Group conversations by client_id. Each group has one optional `main`
  // (project_id null) and zero-or-more sub-threads.
  const groups: ClientGroup[] = React.useMemo(() => {
    const byClient = new Map<string, ClientGroup>()
    for (const c of conversations) {
      if (!c.client_id || !c.crm_clients) continue
      let g = byClient.get(c.client_id)
      if (!g) {
        g = {
          clientId: c.client_id,
          client: c.crm_clients,
          main: null,
          subThreads: [],
          lastActivity: c.last_message_at,
        }
        byClient.set(c.client_id, g)
      }
      if (c.project_id) g.subThreads.push(c)
      else g.main = c
      // Track most recent activity across all threads in the group.
      if (
        c.last_message_at &&
        (!g.lastActivity || c.last_message_at > g.lastActivity)
      ) {
        g.lastActivity = c.last_message_at
      }
    }
    return Array.from(byClient.values()).sort((a, b) => {
      if (!a.lastActivity) return 1
      if (!b.lastActivity) return -1
      return b.lastActivity.localeCompare(a.lastActivity)
    })
  }, [conversations])

  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null)
  const [pickingProject, setPickingProject] = React.useState(false)
  /**
   * Mobile-only view state. On lg+ the grid is always two columns, so this
   * is ignored. On mobile we show one panel at a time so the thread isn't
   * stacked below the list. Default "list" — user picks a client to enter.
   */
  const [mobileView, setMobileView] = React.useState<"list" | "thread">("list")

  // Auto-select the first client on lg+ only so mobile can land on the list.
  React.useEffect(() => {
    if (selectedClientId || !groups[0]) return
    if (typeof window === "undefined") return
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSelectedClientId(groups[0].clientId)
    }
  }, [groups, selectedClientId])

  // Reset active sub-thread when switching clients.
  React.useEffect(() => {
    setActiveProjectId(null)
    setPickingProject(false)
  }, [selectedClientId])

  const selectedGroup = groups.find((g) => g.clientId === selectedClientId) ?? null

  // Projects belonging to the selected client — for the "+ New thread" picker.
  // Excludes projects that already have a sub-thread.
  const { data: clientProjects = [] } = useQuery({
    queryKey: ["client-projects", selectedClientId],
    enabled: Boolean(selectedClientId),
    queryFn: async (): Promise<ClientProjectRow[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, client_id")
        .eq("client_id", selectedClientId!)
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as ClientProjectRow[]
    },
  })

  const existingProjectIds = new Set(
    selectedGroup?.subThreads.map((t) => t.project_id).filter(Boolean) as string[],
  )
  const projectsAvailableForNewThread = clientProjects.filter(
    (p) => !existingProjectIds.has(p.id),
  )

  const activeProjectThread =
    activeProjectId
      ? selectedGroup?.subThreads.find((t) => t.project_id === activeProjectId) ?? null
      : null
  const activeProjectTitle =
    activeProjectThread?.projects?.title ??
    activeProjectThread?.subject ??
    clientProjects.find((p) => p.id === activeProjectId)?.title ??
    "Project"

  // API path & counterparty for the currently-visible thread.
  const apiPath = selectedGroup
    ? activeProjectId
      ? `/api/clients/${selectedGroup.clientId}/messages?projectId=${activeProjectId}`
      : `/api/clients/${selectedGroup.clientId}/messages`
    : null

  return (
    <div className="space-y-6 pb-12">
      <div>
        <H1 className="text-2xl font-medium">Messages</H1>
        <Muted className="text-sm">
          One thread per client — open a project sub-thread for project-scoped chatter.
        </Muted>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 min-h-[60vh]">
        {/* Client list — on mobile, hidden once user enters a thread. */}
        <Surface
          className={cn(
            "overflow-hidden flex-col",
            mobileView === "list" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <div className="px-4 py-3 border-b border-zinc-200">
            <P className="text-xs font-bold uppercase tracking-widest text-zinc-500">Clients</P>
          </div>
          {isLoading ? (
            <div className="p-3 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Inbox className="h-8 w-8 text-zinc-300 mb-2" strokeWidth={1.5} />
              <P className="text-sm font-medium">No conversations yet</P>
              <Muted className="text-xs mt-1">
                Messages start when a client opens their portal and writes you.
              </Muted>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 overflow-y-auto">
              {groups.map((g) => {
                const isActive = selectedClientId === g.clientId
                const subCount = g.subThreads.length
                return (
                  <button
                    key={g.clientId}
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-start gap-3",
                      isActive && "bg-zinc-50",
                    )}
                    onClick={() => {
                      setSelectedClientId(g.clientId)
                      setMobileView("thread")
                    }}
                  >
                    <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <P className="text-sm font-medium truncate">{clientLabel(g.client)}</P>
                      <Muted className="text-[11px] truncate">
                        {g.client.email ?? "Client"}
                        {g.lastActivity &&
                          ` · ${new Date(g.lastActivity).toLocaleDateString()}`}
                        {subCount > 0 && ` · ${subCount} project${subCount === 1 ? "" : "s"}`}
                      </Muted>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Surface>

        {/* Active thread — on mobile, hidden until user picks a client. */}
        <Surface
          className={cn(
            "p-4 sm:p-6 flex-col",
            mobileView === "thread" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          {selectedGroup && apiPath ? (
            <>
              <div className="pb-4 border-b border-zinc-200 mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileView("list")}
                    className="lg:hidden h-8 w-8 -ml-1 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0"
                    aria-label="Back to client list"
                  >
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <div className="min-w-0">
                    <P className="text-sm font-medium truncate">{clientLabel(selectedGroup.client)}</P>
                    <Muted className="text-xs truncate">
                      {selectedGroup.client.email ?? "Client"}
                      {activeProjectId ? ` · ${activeProjectTitle}` : ""}
                    </Muted>
                  </div>
                </div>
                <Link
                  href={`/clients/${selectedGroup.clientId}`}
                  className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors shrink-0 underline-offset-2 hover:underline"
                >
                  View client
                </Link>
              </div>

              {/* Sub-thread tabs: Main + each project + "+" picker. */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveProjectId(null)}
                  className={cn(
                    "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs font-medium border transition-colors",
                    activeProjectId === null
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300",
                  )}
                >
                  <Hash className="h-3 w-3" strokeWidth={1.5} />
                  Main
                </button>
                {selectedGroup.subThreads.map((t) => {
                  const id = t.project_id!
                  const title = t.projects?.title ?? t.subject ?? "Project"
                  const isActive = activeProjectId === id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveProjectId(id)}
                      className={cn(
                        "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs font-medium border transition-colors max-w-[180px]",
                        isActive
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300",
                      )}
                      title={title}
                    >
                      <Folder className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{title}</span>
                    </button>
                  )
                })}
                {projectsAvailableForNewThread.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPickingProject((v) => !v)}
                      className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs font-medium border border-dashed border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      <Plus className="h-3 w-3" strokeWidth={1.5} />
                      Project thread
                    </button>
                    {pickingProject && (
                      <div className="absolute z-10 mt-1 right-0 w-64 rounded-md border border-zinc-200 bg-white shadow-lg p-1 max-h-64 overflow-y-auto">
                        {projectsAvailableForNewThread.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-zinc-50 flex items-center gap-1.5"
                            onClick={() => {
                              setActiveProjectId(p.id)
                              setPickingProject(false)
                            }}
                          >
                            <Folder className="h-3 w-3 text-zinc-400 shrink-0" strokeWidth={1.5} />
                            <span className="truncate">{p.title ?? "Untitled project"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hint shown for brand-new sub-thread (no conversation row yet). */}
              {activeProjectId && !activeProjectThread && (
                <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  Starting a new thread scoped to <strong>{activeProjectTitle}</strong>. Send your
                  first message to open it.
                </div>
              )}

              <MessageThread
                key={apiPath}
                apiPath={apiPath}
                selfRole="freelancer"
                counterpartyName={
                  selectedGroup.client.name ?? selectedGroup.client.email ?? "your client"
                }
              />

              {/* Quick link to project page when on a project sub-thread. */}
              {activeProjectId && (
                <div className="mt-3 text-right">
                  <Link
                    href={`/projects/${activeProjectId}`}
                    className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors underline-offset-2 hover:underline"
                  >
                    Open project →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-8 w-8 text-zinc-300 mb-2" strokeWidth={1.5} />
              <Muted className="text-sm">Select a conversation to start chatting.</Muted>
            </div>
          )}
        </Surface>
      </div>
    </div>
  )
}
