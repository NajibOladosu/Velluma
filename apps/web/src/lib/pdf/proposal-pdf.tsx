/**
 * ProposalDocument — @react-pdf/renderer component
 *
 * Renders a professional multi-page proposal PDF.
 * Uses only built-in PDF fonts (Helvetica) — no external font downloads.
 *
 * Structure:
 *   1. Cover page — title, client, value, date
 *   2. Content pages — welcome, scope, packages, agreement, payment
 *   3. Signature page — freelancer + client blocks
 */
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"

// ---------------------------------------------------------------------------
// Palette — monochrome to match Velluma design language
// ---------------------------------------------------------------------------
const C = {
  black: "#09090b",   // zinc-950
  dark: "#18181b",    // zinc-900
  mid: "#52525b",     // zinc-600
  muted: "#a1a1aa",   // zinc-400
  border: "#e4e4e7",  // zinc-200
  subtle: "#f4f4f5",  // zinc-100
  white: "#ffffff",
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.white,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.5,
  },
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: C.dark,
    color: C.white,
    padding: 60,
    flexDirection: "column",
    justifyContent: "space-between",
  },

  // ── Cover elements ────────────────────────────────────────────────────────
  coverEyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 32,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 32,
    lineHeight: 1.2,
    color: C.white,
    maxWidth: 400,
    marginBottom: 20,
  },
  coverClient: {
    fontSize: 13,
    color: "#d4d4d8",
    marginBottom: 8,
  },
  coverMeta: {
    fontSize: 10,
    color: C.muted,
  },
  coverFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#3f3f46",
    paddingTop: 20,
  },
  coverBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: C.white,
    letterSpacing: 1,
  },
  coverValuePill: {
    backgroundColor: "#27272a",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  coverValueLabel: {
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  coverValueAmount: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: C.white,
  },

  // ── Page header ───────────────────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pageHeaderBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.black,
    letterSpacing: 0.5,
  },
  pageHeaderTitle: {
    fontSize: 9,
    color: C.muted,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 10,
  },

  // ── Typography ────────────────────────────────────────────────────────────
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: C.black,
    marginBottom: 8,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: C.black,
    marginTop: 4,
    marginBottom: 6,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: C.dark,
    marginTop: 4,
    marginBottom: 4,
  },
  body: {
    fontSize: 10,
    color: C.mid,
    lineHeight: 1.7,
    marginBottom: 8,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginVertical: 20,
  },

  // ── Pricing table ─────────────────────────────────────────────────────────
  tierRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  tierAccent: {
    width: 4,
    backgroundColor: C.dark,
  },
  tierBody: {
    flex: 1,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tierName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: C.black,
    marginBottom: 3,
  },
  tierDesc: {
    fontSize: 9,
    color: C.mid,
    maxWidth: 280,
  },
  tierPrice: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: C.black,
  },

  // ── Line item row (add-ons, payment) ──────────────────────────────────────
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  lineLabel: {
    fontSize: 10,
    color: C.mid,
  },
  lineValue: {
    fontSize: 10,
    color: C.dark,
    fontFamily: "Helvetica-Bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: C.black,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: C.black,
  },

  // ── Legal clause ──────────────────────────────────────────────────────────
  clause: {
    marginBottom: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
  },
  clauseTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.dark,
    marginBottom: 4,
  },
  clauseBody: {
    fontSize: 9,
    color: C.mid,
    lineHeight: 1.6,
  },

  // ── Bullet list ───────────────────────────────────────────────────────────
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    width: 16,
    fontSize: 10,
    color: C.muted,
  },
  listItemText: {
    flex: 1,
    fontSize: 10,
    color: C.mid,
    lineHeight: 1.6,
  },

  // ── Signature ─────────────────────────────────────────────────────────────
  signatureGrid: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 16,
  },
  signatureRole: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: C.muted,
    marginBottom: 32,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: C.dark,
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 9,
    color: C.mid,
  },
  signatureDate: {
    fontSize: 8,
    color: C.muted,
    marginTop: 2,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: C.muted,
  },
})

// ---------------------------------------------------------------------------
// TipTap JSON → PDF nodes
// ---------------------------------------------------------------------------

interface TipTapMark {
  type: "bold" | "italic" | "underline" | string
}

interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  marks?: TipTapMark[]
  text?: string
}

function renderInline(node: TipTapNode): React.ReactElement {
  if (node.type === "text") {
    const isBold = node.marks?.some((m) => m.type === "bold")
    const isItalic = node.marks?.some((m) => m.type === "italic")
    return (
      <Text
        key={Math.random()}
        style={{
          fontFamily: isBold ? "Helvetica-Bold" : isItalic ? "Helvetica-Oblique" : "Helvetica",
          fontStyle: isItalic ? "italic" : "normal",
        }}
      >
        {node.text ?? ""}
      </Text>
    )
  }
  return <Text key={Math.random()}>{node.text ?? ""}</Text>
}

function renderNode(node: TipTapNode, idx: number): React.ReactElement | null {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1
      const headingStyle = level === 1 ? s.h1 : level === 2 ? s.h2 : s.h3
      return (
        <Text key={idx} style={headingStyle}>
          {(node.content ?? []).map((n) => n.text ?? "").join("")}
        </Text>
      )
    }
    case "paragraph": {
      if (!node.content?.length) return <Text key={idx} style={{ fontSize: 6 }}>{" "}</Text>
      return (
        <Text key={idx} style={s.body}>
          {(node.content ?? []).map(renderInline)}
        </Text>
      )
    }
    case "bulletList":
    case "orderedList": {
      return (
        <View key={idx} style={{ marginBottom: 8 }}>
          {(node.content ?? []).map((item, i) => (
            <View key={i} style={s.listItem}>
              <Text style={s.bullet}>
                {node.type === "orderedList" ? `${i + 1}.` : "•"}
              </Text>
              <Text style={s.listItemText}>
                {(item.content ?? [])
                  .flatMap((p) => p.content ?? [])
                  .map((n) => n.text ?? "")
                  .join("")}
              </Text>
            </View>
          ))}
        </View>
      )
    }
    case "blockquote": {
      return (
        <View key={idx} style={{ paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: C.border, marginBottom: 8 }}>
          {(node.content ?? []).map(renderNode)}
        </View>
      )
    }
    default:
      return null
  }
}

function TipTapContent({ json }: { json: unknown }) {
  if (!json || typeof json !== "object") {
    return <Text style={s.body}>(No content)</Text>
  }
  const doc = json as TipTapNode
  if (doc.type !== "doc" || !doc.content?.length) {
    return <Text style={s.body}>(No content)</Text>
  }
  return <>{doc.content.map((node, i) => renderNode(node, i))}</>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

// ---------------------------------------------------------------------------
// PageHeader — printed on every content page
// ---------------------------------------------------------------------------

function PageHeader({ title }: { title: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderBrand}>VELLUMA</Text>
      <Text style={s.pageHeaderTitle}>{title}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// PageFooter — printed on every content page
// ---------------------------------------------------------------------------

function PageFooter({ client }: { client: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Prepared for {client}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// ProposalData interface — matches what the API route passes in
// ---------------------------------------------------------------------------

export interface ProposalPdfData {
  id: string
  title: string
  client: string
  clientEmail?: string | null
  status: string
  value: number | null
  createdAt: string
  expiresAt?: string | null
  template?: string | null

  // TipTap JSON or any JSON blob in metadata.content
  content?: unknown

  // Optional structured sections (from metadata)
  welcomeMessage?: string | null
  scopeItems?: string[]
  tiers?: { name: string; description: string; price: number }[]
  addOns?: { label: string; price: number }[]
  legalClauses?: { title: string; body: string }[]
  depositPercent?: number
  milestones?: number

  // Freelancer info
  freelancerName?: string | null
  freelancerEmail?: string | null
}

// ---------------------------------------------------------------------------
// ProposalDocument — the exported component
// ---------------------------------------------------------------------------

export function ProposalDocument({ data }: { data: ProposalPdfData }) {
  const total = data.value ?? 0
  const addOnsTotal = (data.addOns ?? []).reduce((s, a) => s + a.price, 0)
  const deposit = Math.round(total * ((data.depositPercent ?? 50) / 100))
  const balance = total - deposit
  const hasContent =
    data.content &&
    typeof data.content === "object" &&
    (data.content as TipTapNode).type === "doc" &&
    ((data.content as TipTapNode).content?.length ?? 0) > 0

  return (
    <Document
      title={data.title}
      author="Velluma"
      subject={`Proposal for ${data.client}`}
      creator="Velluma"
      producer="Velluma"
    >
      {/* ════════════════════════════════════════
          PAGE 1 — Cover
          ════════════════════════════════════════ */}
      <Page size="A4" style={s.coverPage}>
        {/* Top section */}
        <View>
          <Text style={s.coverEyebrow}>Project Proposal</Text>
          <Text style={s.coverTitle}>{data.title}</Text>
          <Text style={s.coverClient}>Prepared for {data.client}</Text>
          {data.clientEmail && (
            <Text style={s.coverMeta}>{data.clientEmail}</Text>
          )}
          <Text style={{ ...s.coverMeta, marginTop: 8 }}>
            {fmtDate(data.createdAt)}
            {data.expiresAt ? `  ·  Valid until ${fmtDate(data.expiresAt)}` : ""}
          </Text>
        </View>

        {/* Bottom footer */}
        <View style={s.coverFooterRow}>
          <View>
            <Text style={s.coverBrand}>VELLUMA</Text>
            {data.freelancerName && (
              <Text style={{ ...s.coverMeta, marginTop: 4 }}>{data.freelancerName}</Text>
            )}
          </View>
          {total > 0 && (
            <View style={s.coverValuePill}>
              <Text style={s.coverValueLabel}>Total Value</Text>
              <Text style={s.coverValueAmount}>{fmt(total)}</Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════
          PAGE 2 — Welcome / Scope
          ════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader title={data.title} />
        <PageFooter client={data.client} />

        {/* Welcome section */}
        {data.welcomeMessage && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Welcome</Text>
            <Text style={s.body}>{data.welcomeMessage}</Text>
          </View>
        )}

        {/* Rich-text content (TipTap) — shown if present */}
        {hasContent && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Proposal Details</Text>
            <TipTapContent json={data.content} />
          </View>
        )}

        {/* Scope of work — bullet list */}
        {(data.scopeItems?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Scope of Work</Text>
            {(data.scopeItems ?? []).map((item, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.listItemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* ════════════════════════════════════════
          PAGE 3 — Packages & Pricing
          ════════════════════════════════════════ */}
      {(data.tiers?.length ?? 0) > 0 && (
        <Page size="A4" style={s.page}>
          <PageHeader title={data.title} />
          <PageFooter client={data.client} />

          <View style={s.section}>
            <Text style={s.sectionLabel}>Packages</Text>
            {(data.tiers ?? []).map((tier, i) => (
              <View key={i} style={s.tierRow}>
                <View style={s.tierAccent} />
                <View style={s.tierBody}>
                  <View>
                    <Text style={s.tierName}>{tier.name}</Text>
                    <Text style={s.tierDesc}>{tier.description}</Text>
                  </View>
                  <Text style={s.tierPrice}>{fmt(tier.price)}</Text>
                </View>
              </View>
            ))}
          </View>

          {(data.addOns?.length ?? 0) > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Add-Ons</Text>
              {(data.addOns ?? []).map((addon, i) => (
                <View key={i} style={s.lineRow}>
                  <Text style={s.lineLabel}>{addon.label}</Text>
                  <Text style={s.lineValue}>{fmt(addon.price)}</Text>
                </View>
              ))}
            </View>
          )}
        </Page>
      )}

      {/* ════════════════════════════════════════
          PAGE 4 — Agreement & Payment
          ════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader title={data.title} />
        <PageFooter client={data.client} />

        {/* Legal clauses */}
        {(data.legalClauses?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Agreement Terms</Text>
            {(data.legalClauses ?? []).map((clause, i) => (
              <View key={i} style={s.clause}>
                <Text style={s.clauseTitle}>{clause.title}</Text>
                <Text style={s.clauseBody}>{clause.body}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.divider} />

        {/* Payment summary */}
        {total > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Payment Terms</Text>
            <View style={s.lineRow}>
              <Text style={s.lineLabel}>Deposit ({data.depositPercent ?? 50}%)</Text>
              <Text style={s.lineValue}>{fmt(deposit)}</Text>
            </View>
            <View style={s.lineRow}>
              <Text style={s.lineLabel}>Balance on completion</Text>
              <Text style={s.lineValue}>{fmt(balance)}</Text>
            </View>
            {(data.milestones ?? 0) > 0 && (
              <View style={s.lineRow}>
                <Text style={s.lineLabel}>Payment milestones</Text>
                <Text style={s.lineValue}>{data.milestones}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Project Value</Text>
              <Text style={s.totalValue}>{fmt(total)}</Text>
            </View>
          </View>
        )}

        <View style={s.divider} />

        {/* Signature blocks */}
        <View style={{ ...s.section, marginTop: 8 }}>
          <Text style={s.sectionLabel}>Signatures</Text>
          <View style={s.signatureGrid}>
            <View style={s.signatureBox}>
              <Text style={s.signatureRole}>Service Provider</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureName}>{data.freelancerName ?? "___________________________"}</Text>
              <Text style={s.signatureDate}>Date: ___________</Text>
            </View>
            <View style={s.signatureBox}>
              <Text style={s.signatureRole}>Client</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureName}>{data.client}</Text>
              <Text style={s.signatureDate}>Date: ___________</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
