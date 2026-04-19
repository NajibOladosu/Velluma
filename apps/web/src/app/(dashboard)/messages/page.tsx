"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { H1, Muted, P } from "@/components/ui/typography"
import { Surface } from "@/components/ui/surface"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageThread } from "@/components/messages/message-thread"
import { MessageSquare, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConversationRow {
  id: string
  contract_id: string
  last_message_at: string | null
  contracts: { id: string; title: string; client_email: string | null } | null
}

export default function MessagesPage() {
  const supabase = React.useMemo(() => createClient(), [])

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<ConversationRow[]> => {
      const { data, error } = await supabase
        .from("contract_conversations")
        .select("id, contract_id, last_message_at, contracts(id, title, client_email)")
        .order("last_message_at", { ascending: false, nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as ConversationRow[]
    },
    refetchInterval: 10_000,
  })

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = conversations.find((c) => c.contract_id === selectedId) ?? conversations[0] ?? null

  return (
    <div className="space-y-6 pb-12">
      <div>
        <H1 className="text-2xl font-medium">Messages</H1>
        <Muted className="text-sm">All client conversations across your contracts.</Muted>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 min-h-[60vh]">
        {/* Conversation list */}
        <Surface className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-200">
            <P className="text-xs font-bold uppercase tracking-widest text-zinc-500">Conversations</P>
          </div>
          {isLoading ? (
            <div className="p-3 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Inbox className="h-8 w-8 text-zinc-300 mb-2" strokeWidth={1.5} />
              <P className="text-sm font-medium">No conversations yet</P>
              <Muted className="text-xs mt-1">Messages start when a client opens their portal and writes you.</Muted>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 overflow-y-auto">
              {conversations.map((c) => {
                const isActive = (selected?.contract_id ?? null) === c.contract_id
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-start gap-3",
                      isActive && "bg-zinc-50"
                    )}
                    onClick={() => setSelectedId(c.contract_id)}
                  >
                    <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <P className="text-sm font-medium truncate">{c.contracts?.title ?? "Contract"}</P>
                      <Muted className="text-[11px] truncate">
                        {c.contracts?.client_email ?? "Client"}
                        {c.last_message_at && ` · ${new Date(c.last_message_at).toLocaleDateString()}`}
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
                  <P className="text-sm font-medium truncate">{selected.contracts?.title ?? "Conversation"}</P>
                  <Muted className="text-xs">{selected.contracts?.client_email ?? "Client"}</Muted>
                </div>
                <Link
                  href={`/contracts/${selected.contract_id}`}
                  className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors shrink-0 underline-offset-2 hover:underline"
                >
                  View contract
                </Link>
              </div>
              <MessageThread
                apiPath={`/api/contracts/${selected.contract_id}/messages`}
                selfRole="freelancer"
                counterpartyName={selected.contracts?.client_email ?? "your client"}
              />
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
