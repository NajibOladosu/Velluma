/**
 * InvoiceDocument — @react-pdf/renderer component.
 *
 * Server-rendered invoice PDF used by /api/invoices/[id]/pdf. Layout
 * mirrors the HTML email template (invoice-email-template.ts) so what the
 * client sees in their inbox is what they get if they download.
 */
import React from "react"
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer"

export interface InvoicePdfLineItem {
  description: string
  qty: number
  unit_price: number
  total: number
}

export interface InvoicePdfData {
  invoiceNumber: string
  issuedDate: string | null
  dueDate: string | null

  // Recipient
  clientName: string
  clientEmail: string

  // Sender
  businessName: string
  businessEmail: string | null
  businessTaxId: string | null

  // Billing
  projectTitle: string
  contractTitle: string | null
  lineItems: InvoicePdfLineItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  currency: string

  notes: string | null
  paymentLinkUrl: string | null
  brandAccentHex: string
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
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#18181b" },
    header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1pt solid #e4e4e7", paddingBottom: 16 },
    headerLabel: { fontSize: 9, color: "#71717a", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700 },
    invoiceNumber: { fontSize: 14, fontWeight: 700, marginTop: 4 },
    businessName: { fontSize: 12, fontWeight: 600 },
    businessSub:  { fontSize: 9, color: "#71717a", marginTop: 2 },

    section: { marginTop: 24 },
    metaGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
    metaCol: { flex: 1 },
    metaLabel: { fontSize: 8, color: "#71717a", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 },
    metaValue: { fontSize: 11, marginTop: 4, color: "#18181b" },

    table: { marginTop: 24, border: "1pt solid #e4e4e7", borderRadius: 4, overflow: "hidden" },
    tHead: { flexDirection: "row", backgroundColor: "#fafafa", paddingVertical: 8, paddingHorizontal: 12 },
    th: { fontSize: 8, color: "#71717a", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 },
    tRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderTop: "1pt solid #f4f4f5" },
    cellDesc: { flex: 4, fontSize: 10 },
    cellQty:  { flex: 1, fontSize: 10, textAlign: "right" },
    cellRate: { flex: 1.5, fontSize: 10, textAlign: "right" },
    cellTotal: { flex: 1.5, fontSize: 10, textAlign: "right", fontWeight: 700 },

    totals: { marginTop: 16, alignSelf: "flex-end", width: 240 },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    totalsKey: { fontSize: 10, color: "#71717a" },
    totalsVal: { fontSize: 10, color: "#18181b" },
    totalsGrand: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1pt solid #e4e4e7" },
    totalsGrandKey: { fontSize: 11, fontWeight: 700 },
    totalsGrandVal: { fontSize: 13, fontWeight: 700 },

    payNow: { marginTop: 28, padding: 12, backgroundColor: "#18181b", borderRadius: 4, alignSelf: "flex-start" },
    payNowText: { color: "#ffffff", fontSize: 10, fontWeight: 700 },
    payNowUrl: { color: "#a1a1aa", fontSize: 8, marginTop: 4 },

    notes: { marginTop: 20, paddingTop: 12, borderTop: "1pt solid #e4e4e7" },
    notesLabel: { fontSize: 8, color: "#71717a", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 },
    notesBody: { fontSize: 10, color: "#52525b", marginTop: 4, lineHeight: 1.5 },

    footer: { marginTop: 32, paddingTop: 12, borderTop: "1pt solid #e4e4e7", fontSize: 8, color: "#a1a1aa" },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Invoice {data.invoiceNumber}</Text>
            <Text style={styles.invoiceNumber}>{data.businessName}</Text>
            {data.businessEmail && (
              <Text style={styles.businessSub}>{data.businessEmail}</Text>
            )}
            {data.businessTaxId && (
              <Text style={styles.businessSub}>Tax ID: {data.businessTaxId}</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.headerLabel}>Bill to</Text>
            <Text style={styles.businessName}>{data.clientName}</Text>
            <Text style={styles.businessSub}>{data.clientEmail}</Text>
          </View>
        </View>

        {/* Meta grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{fmtDate(data.issuedDate)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Due</Text>
            <Text style={styles.metaValue}>{fmtDate(data.dueDate)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Project</Text>
            <Text style={styles.metaValue}>{data.projectTitle}</Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.th, { flex: 4 }]}>Description</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Rate</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Total</Text>
          </View>
          {data.lineItems.length === 0 ? (
            <View style={styles.tRow}>
              <Text style={[styles.cellDesc, { textAlign: "center", color: "#71717a" }]}>
                {data.contractTitle ?? data.projectTitle} — total {fmtCurrency(data.total, data.currency)}
              </Text>
            </View>
          ) : (
            data.lineItems.map((li, i) => (
              <View key={i} style={styles.tRow}>
                <Text style={styles.cellDesc}>{li.description}</Text>
                <Text style={styles.cellQty}>{li.qty}</Text>
                <Text style={styles.cellRate}>{fmtCurrency(li.unit_price, data.currency)}</Text>
                <Text style={styles.cellTotal}>{fmtCurrency(li.total, data.currency)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsKey}>Subtotal</Text>
            <Text style={styles.totalsVal}>{fmtCurrency(data.subtotal, data.currency)}</Text>
          </View>
          {data.taxAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsKey}>Tax</Text>
              <Text style={styles.totalsVal}>{fmtCurrency(data.taxAmount, data.currency)}</Text>
            </View>
          )}
          {data.discountAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsKey}>Discount</Text>
              <Text style={styles.totalsVal}>−{fmtCurrency(data.discountAmount, data.currency)}</Text>
            </View>
          )}
          <View style={styles.totalsGrand}>
            <Text style={styles.totalsGrandKey}>Total Due</Text>
            <Text style={styles.totalsGrandVal}>{fmtCurrency(data.total, data.currency)}</Text>
          </View>
        </View>

        {/* Pay link */}
        {data.paymentLinkUrl && (
          <View style={[styles.payNow, { backgroundColor: data.brandAccentHex || "#18181b" }]}>
            <Text style={styles.payNowText}>Pay {fmtCurrency(data.total, data.currency)}</Text>
            <Text style={styles.payNowUrl}>{data.paymentLinkUrl}</Text>
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesBody}>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Invoice {data.invoiceNumber} · Generated by Velluma
          {data.businessEmail ? ` · Reply to ${data.businessEmail}` : ""}
        </Text>
      </Page>
    </Document>
  )
}
