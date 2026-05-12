/**
 * Server-only HTML email template for invoices.
 *
 * Renders into a single self-contained HTML string suitable for inlining
 * into a transactional email (Resend / Postmark / SES). Tables-only layout
 * with inline styles — no CSS classes — so it survives Gmail / Outlook /
 * Apple Mail clipping.
 *
 * The Send dialog also displays the same string in an `<iframe srcDoc>`
 * so what-you-preview is what-you-send.
 */

export interface InvoiceEmailLineItem {
  description: string
  qty: number
  unit_price: number
  total: number
}

export interface InvoiceEmailData {
  invoiceNumber: string
  issuedDate: string | null
  dueDate: string | null

  // Recipient
  clientName: string
  clientEmail: string

  // Sender
  businessName: string
  businessEmail: string | null

  // Billing
  projectTitle: string
  contractTitle: string | null
  lineItems: InvoiceEmailLineItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  currency: string

  notes: string | null
  paymentLinkUrl: string | null
  paymentInstructions: string | null
}

function escape(s: string | null | undefined): string {
  if (s == null) return ""
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

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
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function renderInvoiceEmail(data: InvoiceEmailData): {
  subject: string
  html: string
} {
  const subject = `Invoice ${data.invoiceNumber} from ${data.businessName}`

  const itemRows = data.lineItems.length
    ? data.lineItems
        .map(
          (li) => `
        <tr>
          <td style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:14px;color:#18181b;">${escape(li.description)}</td>
          <td align="right" style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:14px;color:#52525b;white-space:nowrap;">${li.qty}</td>
          <td align="right" style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:14px;color:#52525b;white-space:nowrap;">${fmtCurrency(li.unit_price, data.currency)}</td>
          <td align="right" style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:14px;color:#18181b;white-space:nowrap;font-weight:600;">${fmtCurrency(li.total, data.currency)}</td>
        </tr>`,
        )
        .join("")
    : `
        <tr>
          <td colspan="4" style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:14px;color:#71717a;text-align:center;">
            ${escape(data.contractTitle ?? data.projectTitle)} — total ${fmtCurrency(data.total, data.currency)}
          </td>
        </tr>`

  const payCta = data.paymentLinkUrl
    ? `
        <tr><td style="padding:24px 32px 8px 32px;">
          <a href="${escape(data.paymentLinkUrl)}"
             style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
            Pay ${fmtCurrency(data.total, data.currency)}
          </a>
        </td></tr>`
    : `
        <tr><td style="padding:16px 32px;font-size:13px;color:#71717a;">
          Payment instructions: ${escape(data.paymentInstructions ?? "Reply to this email to confirm the payment method.")}
        </td></tr>`

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #e4e4e7;">
          <table role="presentation" width="100%"><tr>
            <td style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:#71717a;text-transform:uppercase;">
              Invoice ${escape(data.invoiceNumber)}
            </td>
            <td align="right" style="font-size:14px;color:#18181b;font-weight:600;">
              ${escape(data.businessName)}
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:24px 32px;">
          <h1 style="margin:0 0 8px 0;font-size:20px;color:#18181b;font-weight:700;">
            Hi ${escape(data.clientName)},
          </h1>
          <p style="margin:0;font-size:14px;color:#52525b;line-height:1.6;">
            Here is the invoice for <strong>${escape(data.projectTitle)}</strong>.
            ${data.dueDate ? `Due <strong>${escape(fmtDate(data.dueDate))}</strong>.` : ""}
          </p>
        </td></tr>

        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="border:1px solid #e4e4e7;border-radius:6px;">
            <thead>
              <tr style="background:#fafafa;">
                <th align="left" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Description</th>
                <th align="right" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Qty</th>
                <th align="right" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Rate</th>
                <th align="right" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </td></tr>

        <tr><td style="padding:16px 32px;">
          <table role="presentation" align="right" cellpadding="0" cellspacing="0" style="min-width:240px;">
            <tr><td align="left" style="padding:4px 8px;font-size:13px;color:#71717a;">Subtotal</td>
                <td align="right" style="padding:4px 8px;font-size:13px;color:#18181b;">${fmtCurrency(data.subtotal, data.currency)}</td></tr>
            ${data.taxAmount > 0 ? `<tr><td align="left" style="padding:4px 8px;font-size:13px;color:#71717a;">Tax</td><td align="right" style="padding:4px 8px;font-size:13px;color:#18181b;">${fmtCurrency(data.taxAmount, data.currency)}</td></tr>` : ""}
            ${data.discountAmount > 0 ? `<tr><td align="left" style="padding:4px 8px;font-size:13px;color:#71717a;">Discount</td><td align="right" style="padding:4px 8px;font-size:13px;color:#18181b;">−${fmtCurrency(data.discountAmount, data.currency)}</td></tr>` : ""}
            <tr><td align="left" style="padding:8px;border-top:1px solid #e4e4e7;font-size:14px;color:#18181b;font-weight:700;">Total Due</td>
                <td align="right" style="padding:8px;border-top:1px solid #e4e4e7;font-size:16px;color:#18181b;font-weight:700;">${fmtCurrency(data.total, data.currency)}</td></tr>
          </table>
        </td></tr>

        ${payCta}

        ${data.notes ? `<tr><td style="padding:16px 32px;font-size:13px;color:#52525b;line-height:1.6;border-top:1px solid #e4e4e7;"><strong>Notes:</strong><br/>${escape(data.notes)}</td></tr>` : ""}

        <tr><td style="padding:16px 32px 24px 32px;font-size:11px;color:#a1a1aa;border-top:1px solid #e4e4e7;">
          Sent via Velluma${data.businessEmail ? ` · Reply to ${escape(data.businessEmail)}` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  return { subject, html }
}
