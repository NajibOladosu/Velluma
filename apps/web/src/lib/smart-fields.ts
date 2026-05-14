/**
 * Smart Field substitution — replaces `{{namespace.key}}` tokens in any
 * contract / proposal / invoice body with live values at render time.
 *
 * Used by:
 *   /p/[id]            — public proposal preview
 *   /portal/*          — client portal contract render
 *   invoice email      — notes / clause lines in `apps/web/src/lib/invoices/email-template.ts`
 *
 * Token format: `{{namespace.key}}`. Whitespace around the dot tolerated.
 * Unknown tokens are left intact so authors can see what didn't resolve.
 */

export interface SmartFieldContext {
  client?: {
    name?: string | null
    email?: string | null
    company?: string | null
  }
  project?: {
    title?: string | null
    description?: string | null
    deliverables?: string[]
    startDate?: string | null
    endDate?: string | null
  }
  contract?: {
    number?: string | null
    total?: number | null
    currency?: string | null
    signedDate?: string | null
  }
  payment?: {
    total?: number | null
    deposit?: number | null
    balance?: number | null
    schedule?: string | null
    milestones?: number | null
    currency?: string | null
  }
  business?: {
    name?: string | null
    legalName?: string | null
    email?: string | null
    taxId?: string | null
  }
  date?: {
    today?: string | null
    start?: string | null
    end?: string | null
  }
}

function fmtCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `$${amount.toLocaleString()}`
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function resolveToken(token: string, ctx: SmartFieldContext): string | null {
  const [nsRaw, keyRaw] = token.split(".")
  const ns = nsRaw?.trim().toLowerCase()
  const key = keyRaw?.trim().toLowerCase().replace(/[_-]/g, "")
  if (!ns || !key) return null

  const currency = ctx.contract?.currency ?? ctx.payment?.currency ?? "USD"

  switch (`${ns}.${key}`) {
    // client
    case "client.name":    return ctx.client?.name ?? null
    case "client.email":   return ctx.client?.email ?? null
    case "client.company": return ctx.client?.company ?? null
    // project
    case "project.title":
    case "project.name":   return ctx.project?.title ?? null
    case "project.description":  return ctx.project?.description ?? null
    case "project.deliverables": return ctx.project?.deliverables?.join(", ") ?? null
    case "project.startdate":    return fmtDate(ctx.project?.startDate)
    case "project.enddate":      return fmtDate(ctx.project?.endDate)
    // contract
    case "contract.number":      return ctx.contract?.number ?? null
    case "contract.total":       return ctx.contract?.total != null ? fmtCurrency(ctx.contract.total, currency) : null
    case "contract.signeddate":  return fmtDate(ctx.contract?.signedDate)
    // payment
    case "payment.total":     return ctx.payment?.total    != null ? fmtCurrency(ctx.payment.total, currency)    : null
    case "payment.deposit":   return ctx.payment?.deposit  != null ? fmtCurrency(ctx.payment.deposit, currency)  : null
    case "payment.balance":   return ctx.payment?.balance  != null ? fmtCurrency(ctx.payment.balance, currency)  : null
    case "payment.schedule":  return ctx.payment?.schedule ?? null
    case "payment.milestones": return ctx.payment?.milestones != null ? String(ctx.payment.milestones) : null
    // business
    case "business.name":      return ctx.business?.name ?? null
    case "business.legalname": return ctx.business?.legalName ?? null
    case "business.email":     return ctx.business?.email ?? null
    case "business.taxid":     return ctx.business?.taxId ?? null
    // date
    case "date.today": return fmtDate(ctx.date?.today ?? new Date().toISOString())
    case "date.start": return fmtDate(ctx.date?.start)
    case "date.end":   return fmtDate(ctx.date?.end)
    default: return null
  }
}

/**
 * Substitute `{{...}}` tokens in `text` using `ctx`. Unresolved tokens are
 * left intact (so authors can spot them). Empty resolved values render as
 * an empty string — not the literal token.
 */
export function substituteSmartFields(
  text: string | null | undefined,
  ctx: SmartFieldContext,
): string {
  if (!text) return ""
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (raw, token: string) => {
    const resolved = resolveToken(token, ctx)
    if (resolved == null) return raw
    return resolved
  })
}

/** Convenience: substitute every section's content. */
export function substituteSections<T extends { content: string }>(
  sections: T[],
  ctx: SmartFieldContext,
): T[] {
  return sections.map((s) => ({ ...s, content: substituteSmartFields(s.content, ctx) }))
}
