/**
 * GET  /api/invoices/[id]/send?preview=1  →  Render the HTML email preview.
 * POST /api/invoices/[id]/send             →  Send the invoice.
 *
 * "Send" today:
 *   - Renders the HTML email via `renderInvoiceEmail()`.
 *   - If STRIPE_SECRET_KEY is configured, generates a Payment Link and
 *     stores it on the invoice row.
 *   - Stamps `sent_at` + `sent_to_email`.
 *   - Records an audit log entry.
 *   - If RESEND_API_KEY / POSTMARK_TOKEN is set, transmits the email; if
 *     not, marks delivered=false so the UI can warn the freelancer that
 *     no transport is configured (per DESIGN_NOTES.md §2).
 *
 * Both Stripe and the email transport are best-effort: a missing key
 * doesn't fail the send — the row still moves to "sent" state so the
 * freelancer can copy the HTML preview into their own email if needed.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"
import { writeAudit, AuditEvents } from "@/lib/audit"
import {
  renderInvoiceEmail,
  type InvoiceEmailData,
  type InvoiceEmailLineItem,
} from "@/lib/invoices/email-template"

interface InvoiceRow {
  id: string
  invoice_number: string | null
  issued_date: string | null
  due_date: string | null
  amount: number
  currency: string
  status: string
  line_items: InvoiceEmailLineItem[] | null
  tax_amount: number | null
  discount_amount: number | null
  notes: string | null
  contract_id: string | null
  project_id: string | null
  stripe_payment_link_url: string | null
  contracts: {
    title: string | null
    client_email: string | null
  } | null
  projects: { title: string | null } | null
}

async function loadInvoice(invoiceId: string, userId: string) {
  // User scope first via RLS-enforcing client. If the user can't see the
  // invoice, refuse to even reveal that it exists.
  const supabase = await createClient()
  const { data: visible } = await supabase
    .from("contract_payments")
    .select("id")
    .eq("id", invoiceId)
    .maybeSingle()
  if (!visible) return null

  // Now read the full payload via service role — joined views are easier
  // and we already validated ownership above.
  void userId
  const service = await createServiceClient()
  const { data } = await service
    .from("contract_payments")
    .select(
      "id, invoice_number, issued_date, due_date, amount, currency, status, " +
        "line_items, tax_amount, discount_amount, notes, contract_id, project_id, " +
        "stripe_payment_link_url, " +
        "contracts(title, client_email), projects(title)",
    )
    .eq("id", invoiceId)
    .maybeSingle<InvoiceRow>()
  return data ?? null
}

function buildEmailData(
  invoice: InvoiceRow,
  business: { name: string; email: string | null },
  toOverride?: string,
): InvoiceEmailData {
  const lineItems: InvoiceEmailLineItem[] = Array.isArray(invoice.line_items)
    ? invoice.line_items
    : []
  const subtotal = lineItems.length
    ? lineItems.reduce((s, li) => s + (Number(li.total) || 0), 0)
    : Number(invoice.amount) || 0
  const tax = Number(invoice.tax_amount) || 0
  const discount = Number(invoice.discount_amount) || 0
  const total = subtotal + tax - discount

  return {
    invoiceNumber: invoice.invoice_number ?? "INV-PENDING",
    issuedDate: invoice.issued_date,
    dueDate: invoice.due_date,

    clientName: invoice.contracts?.client_email?.split("@")[0] ?? "there",
    clientEmail: toOverride ?? invoice.contracts?.client_email ?? "",

    businessName: business.name,
    businessEmail: business.email,

    projectTitle:
      invoice.projects?.title ??
      invoice.contracts?.title ??
      "Your project",
    contractTitle: invoice.contracts?.title ?? null,

    lineItems,
    subtotal,
    taxAmount: tax,
    discountAmount: discount,
    total,
    currency: invoice.currency ?? "USD",

    notes: invoice.notes,
    paymentLinkUrl: invoice.stripe_payment_link_url,
    paymentInstructions: null,
  }
}

async function loadBusinessProfile(userId: string) {
  const service = await createServiceClient()
  const { data: profile } = await service
    .from("profiles")
    .select("display_name, company_name")
    .eq("id", userId)
    .maybeSingle<{
      display_name: string | null
      company_name: string | null
    }>()
  const { data: authData } = await service.auth.admin.getUserById(userId)
  return {
    name:
      profile?.company_name?.trim() ||
      profile?.display_name?.trim() ||
      authData?.user?.email?.split("@")[0] ||
      "Velluma Workspace",
    email: authData?.user?.email ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — preview
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  if (url.searchParams.get("preview") !== "1") {
    return NextResponse.json({ error: "preview=1 query param required" }, { status: 400 })
  }

  const invoice = await loadInvoice(id, user.id)
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const business = await loadBusinessProfile(user.id)
  const data = buildEmailData(invoice, business)
  const { subject, html } = renderInvoiceEmail(data)

  return NextResponse.json({
    emailHtml: html,
    subject,
    toSuggestion: invoice.contracts?.client_email ?? null,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — send
// ─────────────────────────────────────────────────────────────────────────────

interface SendBody {
  to: string
  subject?: string
  body?: string
  cc?: string
  includePdf?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: SendBody = { to: "" }
  try {
    body = (await request.json()) as SendBody
  } catch {
    /* malformed — fall through, validation below catches it */
  }
  if (!body.to || !body.to.includes("@")) {
    return NextResponse.json({ error: "Valid `to` email is required" }, { status: 400 })
  }

  const invoice = await loadInvoice(id, user.id)
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const business = await loadBusinessProfile(user.id)
  const data = buildEmailData(invoice, business, body.to)
  const { subject, html } = renderInvoiceEmail(data)

  // Best-effort: generate a Stripe Payment Link if Stripe is configured.
  // Skipped silently when STRIPE_SECRET_KEY is missing.
  let paymentLinkUrl = invoice.stripe_payment_link_url
  if (!paymentLinkUrl && process.env.STRIPE_SECRET_KEY) {
    try {
      paymentLinkUrl = await createStripePaymentLink(invoice, data.total)
    } catch (err) {
      console.error("[invoices/send] Stripe Payment Link creation failed:", err)
      // Continue — the email still sends without the link.
    }
  }

  // Best-effort: actually transmit. RESEND_API_KEY is the simplest happy
  // path; falls back to "rendered but not delivered" if no provider is set.
  const transport = await sendEmail({
    to: body.to,
    cc: body.cc,
    subject: body.subject?.trim() || subject,
    html,
  })

  const service = await createServiceClient()
  const sentAt = new Date().toISOString()
  const { error: updateError } = await service
    .from("contract_payments")
    .update({
      sent_at: sentAt,
      sent_to_email: body.to,
      stripe_payment_link_url: paymentLinkUrl,
    })
    .eq("id", id)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await writeAudit({
    userId: user.id,
    action: AuditEvents.InvoiceSent ?? "invoice.sent",
    resourceType: "invoice",
    resourceId: id,
    details: {
      to: body.to,
      delivered: transport.delivered,
      provider: transport.provider,
    },
    request,
  })

  return NextResponse.json({
    ok: true,
    emailHtml: html,
    paymentLinkUrl,
    sentAt,
    delivered: transport.delivered,
    deliveryProvider: transport.provider,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Payment Link generation (best-effort)
//
// The full Stripe Connect onboarding is the user's responsibility — see
// DESIGN_NOTES.md §2 + the existing /finance page. When STRIPE_SECRET_KEY
// is set, we can still create a Payment Link against the platform account
// so the freelancer at least has a "Pay Now" URL to share manually.
// ─────────────────────────────────────────────────────────────────────────────

async function createStripePaymentLink(
  invoice: InvoiceRow,
  totalAmount: number,
): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null

  // Inline Stripe HTTP call to avoid a hard dependency on the Stripe SDK in
  // this route — the project already uses Stripe elsewhere; this is just
  // the minimal product+price+payment_link create flow.
  async function stripe(path: string, params: Record<string, string>) {
    const formBody = new URLSearchParams(params).toString()
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    })
    if (!res.ok) {
      throw new Error(`Stripe ${path} failed: ${res.status} ${await res.text()}`)
    }
    return res.json() as Promise<{ id: string; url?: string }>
  }

  // 1) Product
  const product = await stripe("products", {
    name: `${invoice.invoice_number} — ${invoice.contracts?.title ?? invoice.projects?.title ?? "Invoice"}`,
  })
  // 2) Price (one-time)
  const price = await stripe("prices", {
    product: product.id,
    unit_amount: String(Math.round(totalAmount * 100)),
    currency: (invoice.currency ?? "USD").toLowerCase(),
  })
  // 3) Payment Link
  const link = await stripe("payment_links", {
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": "1",
    "metadata[invoice_id]": invoice.id,
    "metadata[contract_id]": invoice.contract_id ?? "",
    "metadata[project_id]": invoice.project_id ?? "",
  })
  return link.url ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Email transport (best-effort)
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail(args: {
  to: string
  cc?: string
  subject: string
  html: string
}): Promise<{ delivered: boolean; provider: string | null }> {
  // Resend is the smallest happy path. If it's not configured, return
  // delivered:false so the UI can warn the user that the email is rendered
  // but not yet wired to a real transport.
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "invoices@velluma.app",
          to: [args.to],
          cc: args.cc ? [args.cc] : undefined,
          subject: args.subject,
          html: args.html,
        }),
      })
      if (!res.ok) {
        console.error("[invoices/send] Resend failure:", await res.text())
        return { delivered: false, provider: "resend" }
      }
      return { delivered: true, provider: "resend" }
    } catch (err) {
      console.error("[invoices/send] Resend exception:", err)
      return { delivered: false, provider: "resend" }
    }
  }
  return { delivered: false, provider: null }
}
