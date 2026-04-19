"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Send, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface Message {
  id: string
  sender_id: string | null
  sender_role: "freelancer" | "client" | null
  sender_email: string | null
  sender_name: string | null
  message: string
  created_at: string
  attachment_url: string | null
  attachment_name: string | null
}

interface MessageThreadProps {
  /** "/api/contracts/{id}/messages" or "/api/portal/contracts/{id}/messages" */
  apiPath: string
  /** Which side am I — affects bubble alignment & "you/them" labels. */
  selfRole: "freelancer" | "client"
  /** Counterparty display name. */
  counterpartyName?: string
  /** Refetch interval ms (default 5s). */
  pollMs?: number
}

export function MessageThread({ apiPath, selfRole, counterpartyName = "Counterparty", pollMs = 5000 }: MessageThreadProps) {
  const qc = useQueryClient()
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", apiPath],
    queryFn: async (): Promise<Message[]> => {
      const res = await fetch(apiPath, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load messages")
      const { data } = await res.json()
      return data ?? []
    },
    refetchInterval: pollMs,
  })

  const send = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
    },
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey: ["messages", apiPath] }) },
  })

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || send.isPending) return
    send.mutate(draft.trim())
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)] min-h-[420px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-4 pb-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
            </div>
            <P className="text-sm font-medium">No messages yet</P>
            <Muted className="text-xs mt-1">Start the conversation with {counterpartyName}.</Muted>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_role === selfRole
            return (
              <div key={m.id} className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
                <div className={cn("flex items-center gap-2", isMine && "flex-row-reverse")}>
                  <div className={cn("h-6 w-6 rounded-md bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-700")}>
                    {(m.sender_name ?? m.sender_email ?? (isMine ? "Y" : "C")).slice(0, 1).toUpperCase()}
                  </div>
                  <Muted className="text-[10px] uppercase tracking-widest">
                    {isMine ? "You" : (m.sender_name ?? counterpartyName)}
                    {" · "}
                    {relativeTime(m.created_at)}
                  </Muted>
                </div>
                <Surface className={cn(
                  "px-3.5 py-2.5 max-w-[80%] inline-block",
                  isMine ? "bg-zinc-900 text-white border-zinc-900" : "bg-white"
                )}>
                  <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", isMine && "text-white")}>{m.message}</p>
                </Surface>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 pt-3 border-t border-zinc-200">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
          rows={2}
          placeholder="Type a message…"
          className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 resize-none"
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={send.isPending || !draft.trim()}>
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.5} />}
        </Button>
      </form>
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
