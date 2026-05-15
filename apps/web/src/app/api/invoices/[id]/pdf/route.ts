/**
 * GET /api/invoices/[id]/pdf
 *
 * Generates a PDF for the given invoice via @react-pdf/renderer.
 * Authentication: Supabase session cookie.
 *
 * Query params:
 *   ?inline=1  →  Content-Disposition: inline  (browser preview tab)
 *   (default)  →  Content-Disposition: attachment (file download)
 *
 * Response: application/pdf
 */
import { NextResponse, type NextRequest } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React, { type JSXElementConstructor } from "react"
import { createClient, createServiceClient } from "@/utils/supabase/server"
import {
  InvoiceDocument,
  type InvoicePdfData,
  type InvoicePdfLineItem,
} from "@/lib/pdf/invoice-pdf"

interface InvoiceRow {
  id: string
  invoice_number: string | null
  issued_date: string | null
  due_date: string | null
  amount: number
  currency: string
  line_items: InvoicePdfLineItem[] | null
  tax_amount: number | null
  discount_amount: number | null
  notes: string | null
  stripe_payment_link_url: string | null
  contracts: {
    title: string | null
    client_email: string | null
  } | null
  projects: { title: string | null } | null
}

interface ProfileRow {
  display_name: string | null
  company_name: string | null
  legal_business_name: string | null
  billing_email: string | null
  tax_id: string | null
  brand_accent_hex: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Ownership check via RLS first
  const { data: visible } = await supabase
    .from("contract_payments")
    .select("id")
    .eq("id", id)
    .maybeSingle()
  if (!visible) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Service role for joined fetch (already validated above)
  const service = await createServiceClient()
  const { data: row } = await service
    .from("contract_payments")
    .select(
      "id, invoice_number, issued_date, due_date, amount, currency, " +
        "line_items, tax_amount, discount_amount, notes, " +
        "stripe_payment_link_url, " +
        "contracts(title, client_email), projects(title)",
    )
    .eq("id", id)
    .maybeSingle<InvoiceRow>()
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: profile } = await service
    .from("profiles")
    .select("display_name, company_name, legal_business_name, billing_email, tax_id, brand_accent_hex")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>()

  const { data: authData } = await service.auth.admin.getUserById(user.id)

  // Build PDF data
  const lineItems = Array.isArray(row.line_items) ? row.line_items : []
  const subtotal = lineItems.length
    ? lineItems.reduce((s, li) => s + (Number(li.total) || 0), 0)
    : Number(row.amount) || 0
  const tax = Number(row.tax_amount) || 0
  const discount = Number(row.discount_amount) || 0
  const total = subtotal + tax - discount

  const businessName =
    profile?.legal_business_name?.trim() ||
    profile?.company_name?.trim() ||
    profile?.display_name?.trim() ||
    authData?.user?.email?.split("@")[0] ||
    "Velluma Workspace"

  const data: InvoicePdfData = {
    invoiceNumber: row.invoice_number ?? "INV-PENDING",
    issuedDate: row.issued_date,
    dueDate: row.due_date,
    clientName: row.contracts?.client_email?.split("@")[0] ?? "Client",
    clientEmail: row.contracts?.client_email ?? "",
    businessName,
    businessEmail: profile?.billing_email ?? authData?.user?.email ?? null,
    businessTaxId: profile?.tax_id ?? null,
    projectTitle:
      row.projects?.title ?? row.contracts?.title ?? "Your project",
    contractTitle: row.contracts?.title ?? null,
    lineItems,
    subtotal,
    taxAmount: tax,
    discountAmount: discount,
    total,
    currency: row.currency ?? "USD",
    notes: row.notes,
    paymentLinkUrl: row.stripe_payment_link_url,
    brandAccentHex: profile?.brand_accent_hex ?? "#18181b",
  }

  // @react-pdf JSX in a .ts route — use React.createElement directly to
  // avoid coupling this file to JSX transpilation.
  const buffer = await renderToBuffer(
    React.createElement(InvoiceDocument, { data }) as React.ReactElement<
      DocumentProps,
      string | JSXElementConstructor<unknown>
    >,
  )

  const filename = `${row.invoice_number ?? "invoice"}.pdf`
  const inline = new URL(request.url).searchParams.get("inline") === "1"

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  })
}
