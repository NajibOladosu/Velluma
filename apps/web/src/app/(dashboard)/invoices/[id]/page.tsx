"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  Loader2,
  MoreHorizontal,
  Send,
  XCircle,
} from "lucide-react"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { H1, H2, Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useInvoice, useUpdateInvoice } from "@/lib/queries/invoices"
import { SendInvoiceDialog } from "@/components/invoices/send-invoice-dialog"

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const STATUS_VARIANT: Record<string, "default" | "emerald" | "outline"> = {
  paid:       "emerald",
  processing: "default",
  upcoming:   "outline",
  overdue:    "outline",
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const router = useRouter()
  const { toast } = useToast()

  const { data: invoice, isLoading, isError, refetch } = useInvoice(id)
  const update = useUpdateInvoice()
  const [sendOpen, setSendOpen] = React.useState(false)
  const [linkCopied, setLinkCopied] = React.useState(false)

  function markPaid() {
    if (!invoice) return
    update.mutate({ id: invoice.id, status: "completed", completedAt: new Date().toISOString() })
  }

  function copyPaymentLink() {
    if (!invoice?.stripePaymentLinkUrl) return
    navigator.clipboard.writeText(invoice.stripePaymentLinkUrl).catch(() => {})
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1500)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !invoice) {
    return (
      <Surface className="p-8 text-center space-y-3">
        <P className="text-sm">Invoice not found.</P>
        <Button variant="outline" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to invoices
        </Button>
      </Surface>
    )
  }

  const isPaid = invoice.status === "paid"

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        All invoices
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">
            Invoice
          </Muted>
          <H1 className="sm:truncate">{invoice.number}</H1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={STATUS_VARIANT[invoice.status]} className="capitalize">
              {invoice.status}
            </Badge>
            <Muted className="text-xs">
              {invoice.contractTitle} · {invoice.client}
            </Muted>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setSendOpen(true)} className="gap-2">
            <Send className="h-4 w-4" strokeWidth={1.5} />
            {invoice.sentAt ? "Resend" : "Send to client"}
          </Button>
          {!isPaid && (
            <Button
              onClick={markPaid}
              disabled={update.isPending}
              className="gap-2"
            >
              {update.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
              )}
              Mark paid
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => router.push(`/invoices`)}
                className="text-xs gap-2"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
                Back to list
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast({
                    title: "PDF download coming soon",
                    description: "Forward the rendered email from the Send dialog for now.",
                    variant: "info",
                  })
                }
                className="text-xs gap-2"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500" />
                Download PDF
              </DropdownMenuItem>
              {!isPaid && (
                <DropdownMenuItem
                  onClick={() =>
                    update.mutate({ id: invoice.id, status: "failed" })
                  }
                  className="text-xs gap-2"
                >
                  <XCircle className="h-3.5 w-3.5 text-zinc-500" />
                  Mark failed
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetaCard label="Issued" value={fmtDate(invoice.issuedDate)} />
        <MetaCard label="Due"    value={fmtDate(invoice.dueDateIso)} />
        <MetaCard label="Sent"   value={invoice.sentAt ? fmtDate(invoice.sentAt) : "—"} />
        <MetaCard label="Paid"   value={invoice.completedAt ? fmtDate(invoice.completedAt) : "—"} />
      </div>

      {/* Line items */}
      <Surface className="overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200">
          <H2 className="text-base">Line items</H2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Description</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Qty</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Rate</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoice.lineItems.length === 0 ? (
                <tr>
                  <td className="px-5 py-4 text-zinc-700">
                    {invoice.contractTitle}
                  </td>
                  <td className="px-5 py-4 text-right text-zinc-500">1</td>
                  <td className="px-5 py-4 text-right text-zinc-500">
                    {fmtCurrency(invoice.numericAmount, invoice.currency)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-zinc-900">
                    {fmtCurrency(invoice.numericAmount, invoice.currency)}
                  </td>
                </tr>
              ) : (
                invoice.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4 text-zinc-700">{li.description}</td>
                    <td className="px-5 py-4 text-right text-zinc-500">{li.qty}</td>
                    <td className="px-5 py-4 text-right text-zinc-500">
                      {fmtCurrency(li.unit_price, invoice.currency)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-zinc-900">
                      {fmtCurrency(li.total, invoice.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 flex justify-end">
          <table className="text-sm min-w-[260px]">
            <tbody>
              <tr>
                <td className="py-1 pr-6 text-zinc-500">Subtotal</td>
                <td className="py-1 text-right text-zinc-900">{fmtCurrency(invoice.subtotal, invoice.currency)}</td>
              </tr>
              {invoice.taxAmount > 0 && (
                <tr>
                  <td className="py-1 pr-6 text-zinc-500">Tax</td>
                  <td className="py-1 text-right text-zinc-900">{fmtCurrency(invoice.taxAmount, invoice.currency)}</td>
                </tr>
              )}
              {invoice.discountAmount > 0 && (
                <tr>
                  <td className="py-1 pr-6 text-zinc-500">Discount</td>
                  <td className="py-1 text-right text-zinc-900">−{fmtCurrency(invoice.discountAmount, invoice.currency)}</td>
                </tr>
              )}
              <tr className="border-t border-zinc-200">
                <td className="py-2 pr-6 font-semibold text-zinc-900">Total due</td>
                <td className="py-2 text-right font-bold text-zinc-900">{fmtCurrency(invoice.total, invoice.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>

      {/* Payment link */}
      {invoice.stripePaymentLinkUrl && (
        <Surface className="p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Stripe Payment Link</Muted>
            <P className="text-xs text-zinc-700 break-all">{invoice.stripePaymentLinkUrl}</P>
          </div>
          <Button variant="outline" onClick={copyPaymentLink} className="gap-2 shrink-0">
            <Copy className="h-4 w-4" strokeWidth={1.5} />
            {linkCopied ? "Copied" : "Copy"}
          </Button>
        </Surface>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Notes</Muted>
          <P className="text-sm text-zinc-700 whitespace-pre-wrap mt-1">{invoice.notes}</P>
        </Surface>
      )}

      <SendInvoiceDialog
        invoice={invoice}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => {
          setSendOpen(false)
          refetch()
        }}
      />
    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-4">
      <Muted className="text-[10px] uppercase tracking-widest font-bold">{label}</Muted>
      <div className="text-sm font-semibold text-zinc-900 mt-1 truncate">{value}</div>
    </Surface>
  )
}
