"use client"

/**
 * Freelancer-facing modal + trigger for minting a scoped client share link.
 * Used on proposals/[id] and contracts/[id]. The generated URL is the only
 * credential the client needs — no account, no password.
 */

import * as React from "react"
import {
  Share2,
  Link2,
  Copy,
  Check,
  Mail,
  Loader2,
  X,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { H3, Muted, P } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type EngagementType = "proposal" | "contract" | "project"

interface SharePortalLinkProps {
  engagementType: EngagementType
  engagementId: string
  engagementTitle: string
  defaultClientEmail?: string
  /** Label for the trigger button. Default "Share". */
  triggerLabel?: string
  /** Render just the button, or a full trigger with icon? Defaults to icon+label. */
  triggerVariant?: "outline" | "ghost" | "default"
  className?: string
}

const EXPIRIES = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
]

export function SharePortalLink({
  engagementType,
  engagementId,
  engagementTitle,
  defaultClientEmail,
  triggerLabel = "Share",
  triggerVariant = "outline",
  className,
}: SharePortalLinkProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size="sm"
        className={cn("h-9", className)}
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4 sm:mr-2" strokeWidth={1.5} />
        <span className="hidden sm:inline">{triggerLabel}</span>
      </Button>
      {open && (
        <SharePortalLinkModal
          engagementType={engagementType}
          engagementId={engagementId}
          engagementTitle={engagementTitle}
          defaultClientEmail={defaultClientEmail}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

interface ModalProps {
  engagementType: EngagementType
  engagementId: string
  engagementTitle: string
  defaultClientEmail?: string
  onClose: () => void
}

type State =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "success"; url: string; expiresAt: string }
  | { kind: "error"; message: string }

function SharePortalLinkModal({
  engagementType,
  engagementId,
  engagementTitle,
  defaultClientEmail,
  onClose,
}: ModalProps) {
  const [email, setEmail] = React.useState(defaultClientEmail ?? "")
  const [expiresInDays, setExpiresInDays] = React.useState(30)
  const [note, setNote] = React.useState("")
  const [state, setState] = React.useState<State>({ kind: "form" })
  const [copied, setCopied] = React.useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (state.kind === "submitting") return
    setState({ kind: "submitting" })
    try {
      const res = await fetch("/api/portal/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagementType,
          engagementId,
          clientEmail: email.trim().toLowerCase(),
          expiresInDays,
          note: note.trim() || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setState({ kind: "error", message: body.error ?? "Could not generate link" })
        return
      }
      setState({ kind: "success", url: body.url, expiresAt: body.expiresAt })
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      })
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  function mailto(url: string): string {
    const subject = `Your ${engagementType} — ${engagementTitle}`
    const body =
      `Hi,\n\nYou can review "${engagementTitle}" here:\n\n${url}\n\n` +
      `No signup needed — just click the link.\n\nThanks!`
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-zinc-100">
          <div className="min-w-0">
            <H3 className="text-base">Share with client</H3>
            <Muted className="text-xs truncate block">
              Generate a private link for{" "}
              <span className="font-medium text-zinc-700">{engagementTitle}</span>.
            </Muted>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        {state.kind === "success" ? (
          <div className="px-6 py-5 space-y-5">
            <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <P className="text-xs font-medium text-emerald-800">Link ready</P>
                <Muted className="text-[11px] text-emerald-700/80">
                  Expires {new Date(state.expiresAt).toLocaleDateString()} — anyone with
                  this link can view this {engagementType}.
                </Muted>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Share link</label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs font-mono text-zinc-700 truncate">
                  {state.url}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto shrink-0 w-20 justify-center"
                  onClick={() => handleCopy(state.url)}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setState({ kind: "form" })}
              >
                Generate another
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9" asChild>
                  <a href={mailto(state.url)}>
                    <Mail className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                    Email link
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="h-9" asChild>
                  <a href={state.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                    Open
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Client email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  disabled={state.kind === "submitting"}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Shown on the link record. The client doesn&apos;t need this email to sign in.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Expires in</label>
              <div className="grid grid-cols-4 gap-1.5">
                {EXPIRIES.map((opt) => {
                  const active = expiresInDays === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiresInDays(opt.value)}
                      className={cn(
                        "h-9 rounded-md border text-xs font-medium transition-colors",
                        active
                          ? "bg-zinc-900 border-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Internal note <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="For your reference only"
                disabled={state.kind === "submitting"}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors disabled:cursor-not-allowed"
              />
            </div>

            {state.kind === "error" && (
              <div className="rounded-md border border-red-200 bg-red-50/70 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <P className="text-xs font-medium text-red-700">Could not generate link</P>
                  <Muted className="text-[11px] text-red-600/80">{state.message}</Muted>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Link2 className="h-3 w-3" strokeWidth={1.5} /> Revocable anytime from this {engagementType}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-9" disabled={state.kind === "submitting" || !email}>
                  {state.kind === "submitting" && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Generate link
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
