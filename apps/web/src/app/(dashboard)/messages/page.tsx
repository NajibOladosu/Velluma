"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { H1, Muted, P } from "@/components/ui/typography"
import { Surface } from "@/components/ui/surface"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageThread } from "@/components/messages/message-thread"
import { MessageSquare, Inbox, User } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Inbox grouped by client. Each row = one CRM client. Selecting a row opens
 * the client's single thread, no matter how many contracts span it.
 *
 * The conversation itself is `contract_conversations` keyed by
 * (tenant_id, client_id, project_id IS NULL). Schema migration collapsed
 * per-contract threads into one per client (see migration
 * 20260512140000_messages_thread_by_client.sql).
 */

interface ConversationRow {
  id: string
  client_id: string | null
  project_id: string | null
  subject: string | null
  last_message_at: string | null
  crm_clients: { id: string; name: string; email: string | null; company_name: string | null } | null
}

export default function MessagesPage() {
  const supabase = React.useMemo(() => createClient(), [])

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["client-conversations"],
    queryFn: async (): Promise<ConversationRow[]> => {
      // Pull conversations with their crm_clients join. Filter to those
      // with a client_id so legacy contract-only threads don't show up
      // until backfilled.
      const { data, error } = await supabase
        .from("contract_conversations")
        .select(
          "id, client_id, project_id, subject, last_message_at, " +
            "crm_clients(id, name, email, company_name)",
        )
        .not("client_id", "is", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as ConversationRow[]
    },
    refetchInterval: 10_000,
  })

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = React.useMemo(() => {
    return (
      conversations.find((c) => c.id === selectedId) ??
      conversations[0] ??
      null
    )
  }, [conversations, selectedId])

  function clientLabel(c: ConversationRow): string {
    return c.crm_clients?.company_name ?? c.crm_clients?.name ?? c.subject ?? "Client"
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <H1 className="text-2xl font-medium">Messages</H1>
        <Muted className="text-sm">One thread per client — across every project and contract.</Muted>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 min-h-[60vh]">
        {/* Client list */}
        <Surface className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-200">
            <P className="text-xs font-bold uppercase tracking-widest text-zinc-500">Clients</P>
          </div>
          {isLoading ? (
            <div className="p-3 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Inbox className="h-8 w-8 text-zinc-300 mb-2" strokeWidth={1.5} />
              <P className="text-sm font-medium">No conversations yet</P>
              <Muted className="text-xs mt-1">
                Messages start when a client opens their portal and writes you.
              </Muted>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 overflow-y-auto">
              {conversations.map((c) => {
                const isActive = selected?.id === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-start gap-3",
                      isActive && "bg-zinc-50",
                    )}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <P className="text-sm font-medium truncate">{clientLabel(c)}</P>
                      <Muted className="text-[11px] truncate">
                        {c.crm_clients?.email ?? "Client"}
                        {c.last_message_at &&
                          ` · ${new Date(c.last_message_at).toLocaleDateString()}`}
                      </Muted>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Surface>

        {/* Active thread */}
        <Surface className="p-4 sm:p-6 flex flex-col">
          {selected ? (
            <>
              <div className="pb-4 border-b border-zinc-200 mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <P className="text-sm font-medium truncate">{clientLabel(selected)}</P>
                  <Muted className="text-xs truncate">
                    {selected.crm_clients?.email ?? "Client"}
                  </Muted>
                </div>
                {selected.client_id && (
                  <Link
                    href={`/clients/${selected.client_id}`}
                    className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors shrink-0 underline-offset-2 hover:underline"
                  >
                    View client
                  </Link>
                )}
              </div>
              {selected.client_id ? (
                <MessageThread
                  apiPath={`/api/clients/${selected.client_id}/messages`}
                  selfRole="freelancer"
                  counterpartyName={
                    selected.crm_clients?.name ?? selected.crm_clients?.email ?? "your client"
                  }
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="h-8 w-8 text-zinc-300 mb-2" strokeWidth={1.5} />
                  <Muted className="text-sm">Legacy contract thread — open from the contract page.</Muted>
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
