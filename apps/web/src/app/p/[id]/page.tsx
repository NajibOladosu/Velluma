/**
 * /p/[id] — Public client-facing proposal view.
 *
 * This is what the client sees when they receive a proposal link.
 * No dashboard chrome, no settings. Just the proposal, beautifully presented.
 *
 * Auth: none required — uses service role to fetch (proposal is "public" once sent).
 * ?preview=1 — shows a preview banner for the freelancer to review before sending.
 */
import React from "react"
import { notFound } from "next/navigation"
import { createServiceClient } from "@/utils/supabase/server"
import { Check, Shield, Clock, Calendar, ChevronRight } from "lucide-react"

// ---------------------------------------------------------------------------
// Static catalogs (mirror the builder)
// ---------------------------------------------------------------------------

const STANDARD_TIERS: Record<string, {
  name: string; description: string; price: number; features: string[]
}> = {
  foundation: {
    name: "Foundation", price: 2500,
    description: "Core setup and essential features.",
    features: ["5 Core Landing Pages", "Contact Integration", "Basic SEO Setup", "2 Revision Rounds"],
  },
  scale: {
    name: "Scale", price: 5500,
    description: "Advanced features for growing teams.",
    features: ["Everything in Foundation", "E-Commerce Setup", "Analytics Dashboard", "Priority Support"],
  },
  enterprise: {
    name: "Enterprise", price: 9500,
    description: "Full-service for established brands.",
    features: ["Everything in Scale", "Custom Integrations", "Dedicated Account Manager", "Unlimited Revisions"],
  },
}

const CLAUSE_CATALOG: Record<string, { title: string; body: string }> = {
  ip: {
    title: "Intellectual Property Transfer",
    body: "Upon receipt of full payment, all intellectual property rights created during the course of this project shall be irrevocably transferred to the Client.",
  },
  confidentiality: {
    title: "Confidentiality & Non-Disclosure",
    body: "Both parties agree to hold in confidence all proprietary information disclosed during the term of this agreement. This obligation extends for two (2) years after termination.",
  },
  liability: {
    title: "Limitation of Liability",
    body: "Total liability shall not exceed the total amount paid under this agreement. Neither party shall be liable for indirect or consequential damages.",
  },
  revisions: {
    title: "Revision Policy",
    body: "This agreement includes two (2) rounds of revisions per deliverable. Additional revisions are billed at the agreed hourly rate.",
  },
  termination: {
    title: "Termination Clause",
    body: "Either party may terminate with fourteen (14) days written notice. The Client shall pay for all work completed to date.",
  },
}

const RAIL_DISPLAY: Record<string, { icon: string; name: string }> = {
  stripe:   { icon: "💳", name: "Credit / Debit Card" },
  wise:     { icon: "🌍", name: "Wise Transfer" },
  payoneer: { icon: "🟠", name: "Payoneer" },
  paypal:   { icon: "🅿️", name: "PayPal" },
  local:    { icon: "🏦", name: "Bank Transfer" },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })
}

function getVideoEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const loom = url.match(/loom\.com\/share\/([A-Za-z0-9]+)/)
  if (loom) return `https://www.loom.com/embed/${loom[1]}`
  return null
}

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

interface AddOnRow   { id: string; label: string; price: number; enabled: boolean }
interface CustomTier { id: string; title: string; price: number; description: string; features: string[] }
interface WithdrawalMethodRow {
  id: string; rail: string; label: string; account_name: string | null;
  last_four: string | null; currency: string; processing_time: string
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ProposalViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { id } = await params
  const { preview } = await searchParams
  const isPreview = preview === "1"

  // Use service role — proposal is public once sent; no client session required
  const supabase = await createServiceClient()

  // profiles has two FK paths from projects (tenant_id + user_id) so we must
  // use !column_name to disambiguate. Column is display_name, not full_name.
  const { data: row, error } = await supabase
    .from("projects")
    .select("*, crm_clients(name, email), profiles!user_id(display_name)")
    .eq("id", id)
    .single()

  if (error || !row) {
    console.error("[proposal view] fetch error:", error?.message)
    notFound()
  }

  // Draft proposals are only accessible in preview mode (freelancer previewing)
  if (row.status === "draft" && !isPreview) notFound()

  const meta = (row.metadata as Record<string, unknown>) ?? {}
  const client = (row.crm_clients as { name?: string; email?: string } | null)
  const freelancer = (row.profiles as { display_name?: string } | null)
  const clientName = client?.name ?? client?.email ?? "Client"
  const freelancerName = freelancer?.display_name ?? "Your Service Provider"

  // Derive tier
  const selectedTierId = meta.selected_tier as string | undefined
  const customTiers    = (meta.custom_tiers as CustomTier[] | undefined) ?? []
  let activeTier: { name: string; description: string; price: number; features: string[] } | null = null

  if (selectedTierId) {
    if (STANDARD_TIERS[selectedTierId]) {
      activeTier = STANDARD_TIERS[selectedTierId]
    } else {
      const ct = customTiers.find((t) => t.id === selectedTierId)
      if (ct) activeTier = { name: ct.title, description: ct.description, price: ct.price, features: ct.features }
    }
  }

  // Enabled add-ons
  const addOns = (meta.add_ons as AddOnRow[] | undefined) ?? []
  const enabledAddOns = addOns.filter((a) => a.enabled)

  // Legal clauses
  const enabledClauseIds = (meta.enabled_clauses as string[] | undefined) ?? ["ip", "confidentiality", "liability", "revisions", "termination"]
  const extraClauses     = (meta.extra_clauses as { title: string; body: string }[] | undefined) ?? []
  const clauses = [
    ...enabledClauseIds.map((cid) => CLAUSE_CATALOG[cid]).filter(Boolean),
    ...extraClauses,
  ]

  // Financial
  const total         = Number(row.total_budget) || 0
  const depositPct    = Number(meta.deposit_percent) || 50
  const milestones    = Number(meta.milestones) || 0
  const deposit       = Math.round(total * (depositPct / 100))
  const balance       = total - deposit
  const addOnsTotal   = enabledAddOns.reduce((s, a) => s + a.price, 0)

  // Scope content (HTML from TipTap)
  const scopeHtml    = meta.scope_content as string | undefined
  const welcomeMsg   = meta.welcome_message as string | undefined
  const videoUrl     = meta.video_url as string | undefined
  const videoEmbed   = videoUrl ? getVideoEmbed(videoUrl) : null
  const expiresAt    = meta.expires_at as string | undefined

  // Payment methods the freelancer accepts
  const acceptedMethodIds = (meta.accepted_payment_methods as string[] | undefined) ?? []
  let paymentMethods: WithdrawalMethodRow[] = []
  if (acceptedMethodIds.length > 0) {
    const { data: methods } = await supabase
      .from("withdrawal_methods")
      .select("id, rail, label, account_name, last_four, currency, processing_time")
      .in("id", acceptedMethodIds)
      .eq("is_active", true)
    paymentMethods = (methods ?? []) as WithdrawalMethodRow[]
  }

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Preview banner */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-zinc-900 text-white text-center py-2.5 px-4">
          <p className="text-xs font-medium tracking-wide">
            Preview Mode — This is exactly what your client will see when you send this proposal.
          </p>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-zinc-900 tracking-tight">
            {freelancerName}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
            Proposal
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
              Prepared for
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 leading-tight">
              {row.title}
            </h1>
            <p className="text-lg text-zinc-500">
              Hi {clientName} — here&apos;s what we&apos;ve put together for you.
            </p>
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-3 pt-1">
            {total > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3 py-1.5">
                <span className="text-xs font-semibold text-zinc-900">{fmt(total)}</span>
                <span className="text-xs text-zinc-400">total</span>
              </div>
            )}
            {expiresAt && (
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3 py-1.5">
                <Calendar className="h-3 w-3 text-zinc-400" />
                <span className="text-xs text-zinc-600">Valid until {fmtDate(expiresAt)}</span>
              </div>
            )}
            {milestones > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3 py-1.5">
                <Clock className="h-3 w-3 text-zinc-400" />
                <span className="text-xs text-zinc-600">{milestones} payment milestones</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Video ────────────────────────────────────────────────── */}
        {videoEmbed && (
          <section>
            <div className="rounded-xl overflow-hidden border border-zinc-200 bg-black aspect-video">
              <iframe
                src={videoEmbed}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* ── Welcome ──────────────────────────────────────────────── */}
        {welcomeMsg && (
          <section className="bg-white rounded-xl border border-zinc-200 p-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-4">
              A message from {freelancerName}
            </p>
            <p className="text-zinc-700 leading-relaxed whitespace-pre-line">{welcomeMsg}</p>
          </section>
        )}

        {/* ── Scope of Work ────────────────────────────────────────── */}
        {scopeHtml && scopeHtml.replace(/<[^>]+>/g, "").trim() && (
          <section className="bg-white rounded-xl border border-zinc-200 p-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-6">
              Scope of Work
            </p>
            <div
              className="proposal-content"
              dangerouslySetInnerHTML={{ __html: scopeHtml }}
            />
          </section>
        )}

        {/* ── Selected Package ─────────────────────────────────────── */}
        {activeTier && (
          <section className="bg-white rounded-xl border border-zinc-200 p-8 space-y-6">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
              Your Package
            </p>

            <div className="rounded-lg border-2 border-zinc-900 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-zinc-900">{activeTier.name}</h2>
                  <p className="text-sm text-zinc-500">{activeTier.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-zinc-900">{fmt(activeTier.price)}</div>
                </div>
              </div>

              {activeTier.features.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {activeTier.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-zinc-700">{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Enabled add-ons */}
            {enabledAddOns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Included Add-ons
                </p>
                {enabledAddOns.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2.5} />
                      <span className="text-sm text-zinc-700">{addon.label}</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-900">{fmt(addon.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Investment Summary ───────────────────────────────────── */}
        {total > 0 && (
          <section className="bg-white rounded-xl border border-zinc-200 p-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-6">
              Investment Summary
            </p>
            <div className="space-y-0">
              {activeTier && (
                <div className="flex justify-between py-3 border-b border-zinc-100">
                  <span className="text-sm text-zinc-600">{activeTier.name} Package</span>
                  <span className="text-sm font-medium text-zinc-900">{fmt(activeTier.price)}</span>
                </div>
              )}
              {enabledAddOns.map((addon) => (
                <div key={addon.id} className="flex justify-between py-3 border-b border-zinc-100">
                  <span className="text-sm text-zinc-600">{addon.label}</span>
                  <span className="text-sm font-medium text-zinc-900">{fmt(addon.price)}</span>
                </div>
              ))}
              {addOnsTotal > 0 && activeTier && (
                <div className="flex justify-between py-3 border-b border-zinc-100">
                  <span className="text-sm text-zinc-500">Subtotal</span>
                  <span className="text-sm text-zinc-700">{fmt(activeTier.price + addOnsTotal)}</span>
                </div>
              )}
              <div className="flex justify-between pt-4 mt-1">
                <span className="text-base font-bold text-zinc-900">Total</span>
                <span className="text-xl font-bold text-zinc-900">{fmt(total)}</span>
              </div>
            </div>

            {/* Payment schedule */}
            <div className="mt-6 pt-6 border-t border-zinc-100 space-y-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Payment Schedule
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900">
                      Deposit due now ({depositPct}%)
                    </span>
                    <span className="text-sm font-bold text-zinc-900">{fmt(deposit)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">Required to begin work</p>
                </div>
              </div>
              <div className="ml-4 w-px h-4 bg-zinc-200" />
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">Balance on completion</span>
                    <span className="text-sm font-medium text-zinc-700">{fmt(balance)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">Released upon your approval</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Agreement ────────────────────────────────────────────── */}
        {clauses.length > 0 && (
          <section className="bg-white rounded-xl border border-zinc-200 p-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-6">
              Agreement Terms
            </p>
            <div className="space-y-5">
              {clauses.map((clause, i) => (
                <div key={i} className="pl-4 border-l-2 border-zinc-200">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">{clause.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{clause.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── How to Pay ───────────────────────────────────────────── */}
        {paymentMethods.length > 0 && (
          <section className="bg-white rounded-xl border border-zinc-200 p-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-6">
              How to Pay
            </p>
            <div className="space-y-3">
              {paymentMethods.map((m) => {
                const rail = RAIL_DISPLAY[m.rail] ?? { icon: "💳", name: m.rail }
                return (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-lg border border-zinc-200">
                    <span className="text-2xl shrink-0">{rail.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900">{rail.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.account_name && (
                          <span className="text-xs text-zinc-500">{m.account_name}</span>
                        )}
                        {m.last_four && (
                          <span className="text-xs text-zinc-400">····{m.last_four}</span>
                        )}
                        <span className="text-xs text-zinc-400">{m.currency}</span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 shrink-0">{m.processing_time}</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Signature ────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-zinc-200 p-8">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-6">
            Sign &amp; Accept
          </p>
          <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
            By signing below, both parties agree to the terms outlined in this proposal.
            Your signature confirms acceptance of the scope, pricing, and agreement terms above.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Freelancer */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                Service Provider
              </p>
              <div className="border-t-2 border-zinc-900 pt-3 space-y-1">
                <p className="text-sm font-medium text-zinc-900">{freelancerName}</p>
                <p className="text-xs text-zinc-400">Date: ___________</p>
              </div>
            </div>

            {/* Client */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                Client
              </p>
              <div className="border-t-2 border-dashed border-zinc-300 pt-3 space-y-1">
                <p className="text-sm text-zinc-400 italic">Awaiting signature…</p>
                <p className="text-xs text-zinc-300">Date: ___________</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust footer ─────────────────────────────────────────── */}
        <footer className="flex items-center justify-center gap-6 py-6">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="text-[11px]">Secure &amp; encrypted</span>
          </div>
          <span className="text-zinc-200">·</span>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
            <span className="text-[11px]">Funds escrowed until milestone approval</span>
          </div>
          <span className="text-zinc-200">·</span>
          <span className="text-[11px] text-zinc-300">Powered by Velluma</span>
        </footer>

      </main>
    </div>
  )
}
