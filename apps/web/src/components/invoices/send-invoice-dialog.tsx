"use client"

import * as React from "react"
import { Loader2, Send, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Muted } from "@/components/ui/typography"
import {
  useInvoicePreview,
  useSendInvoice,
  type Invoice,
} from "@/lib/queries/invoices"

/**
 * Send-invoice dialog: editable headers on the left, live HTML email
 * preview rendered into a sandboxed iframe on the right.
 *
 * Today's transport is best-effort (Resend if RESEND_API_KEY is set,
 * otherwise the route returns the rendered HTML without delivery). The UI
 * surfaces the delivered-vs-rendered state so the freelancer knows
 * whether the email actually went out or whether they need to copy the
 * preview into their own email client.
 */
export function SendInvoiceDialog({
  invoice,
  open,
  onClose,
  onSent,
}: {
  invoice: Invoice
  open: boolean
  onClose: () => void
  onSent: () => void
}) {
  const preview = useInvoicePreview(invoice.id, open)
  const send = useSendInvoice()

  const [to, setTo] = React.useState("")
  const [cc, setCc] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<{
    delivered: boolean
    provider: string | null
  } | null>(null)

  // Populate fields the first time the preview lands.
  React.useEffect(() => {
    if (!open) return
    if (!to && preview.data?.toSuggestion) setTo(preview.data.toSuggestion)
    if (!subject && preview.data?.subject) setSubject(preview.data.subject)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preview.data])

  // Reset state on close.
  React.useEffect(() => {
    if (!open) {
      setError(null)
      setResult(null)
    }
  }, [open])

  async function handleSend() {
    setError(null)
    if (!to.includes("@")) {
      setError("Enter a valid email address")
      return
    }
    try {
      const res = await send.mutateAsync({
        id: invoice.id,
        to,
        cc: cc || undefined,
        subject: subject || undefined,
      })
      setResult({ delivered: res.delivered, provider: res.deliveryProvider })
      if (res.delivered) {
        // Successfully transmitted — close after a brief confirm so the
        // user sees the result chip.
        setTimeout(() => onSent(), 800)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send")
    }
  }

  function copyHtmlToClipboard() {
    if (!preview.data?.emailHtml) return
    navigator.clipboard.writeText(preview.data.emailHtml).catch(() => {})
  }

  const html = preview.data?.emailHtml ?? ""

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !send.isPending && onClose()}>
      <DialogContent className="max-w-4xl mx-4 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Send invoice {invoice.number}</DialogTitle>
              <Muted className="text-xs mt-0.5">
                Preview on the right is exactly what your client will receive.
              </Muted>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={send.isPending}
              className="text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 flex-1 min-h-0">
          {/* Headers */}
          <div className="space-y-3 min-w-0 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">To</label>
              <Input
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Cc <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <Input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={preview.data?.subject ?? "Invoice from your provider"}
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            {result && (
              <div
                className={
                  result.delivered
                    ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
                    : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
                }
              >
                {result.delivered ? (
                  <>Delivered via {result.provider ?? "transport"}.</>
                ) : (
                  <>
                    Invoice marked as sent, but email transport is not configured
                    (set <code>RESEND_API_KEY</code> in env). Copy the HTML
                    preview and forward manually for now.
                  </>
                )}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyHtmlToClipboard}
              disabled={!html}
              className="w-full"
            >
              Copy HTML
            </Button>
          </div>

          {/* Preview */}
          <div className="border border-zinc-200 rounded-md bg-white overflow-hidden flex flex-col min-h-[420px]">
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">
                Email preview
              </Muted>
              {preview.isLoading && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
            </div>
            {preview.isError ? (
              <div className="flex-1 flex items-center justify-center text-xs text-red-600">
                Failed to render preview.
              </div>
            ) : (
              <iframe
                title={`Invoice ${invoice.number} preview`}
                srcDoc={html}
                sandbox=""
                className="flex-1 w-full bg-white"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={send.isPending || preview.isLoading} className="gap-2">
            {send.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" strokeWidth={1.5} />
                Send now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
