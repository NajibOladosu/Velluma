/**
 * GET /api/search?q=<query>
 *
 * Cross-entity search powering the global command palette. Runs `ilike`
 * queries across clients, projects, contracts, invoices, proposals in
 * parallel under RLS so each user sees only their own data.
 *
 * Returns max ~5 hits per entity to keep the UI snappy and dedupes by id.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

interface SearchHit {
  id: string
  kind: "client" | "project" | "contract" | "invoice" | "proposal"
  label: string
  subtitle?: string
  href: string
}

const LIMIT_PER_KIND = 5

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const q = (url.searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return NextResponse.json({ hits: [] as SearchHit[] })
  }
  const pattern = `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`

  // Run all queries in parallel — RLS narrows each to the caller's rows.
  const [clientsRes, projectsRes, contractsRes, invoicesRes, proposalsRes] =
    await Promise.all([
      supabase
        .from("crm_clients")
        .select("id, name, email, company_name")
        .or(`name.ilike.${pattern},email.ilike.${pattern},company_name.ilike.${pattern}`)
        .limit(LIMIT_PER_KIND),
      supabase
        .from("projects")
        .select("id, title, description, status")
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .limit(LIMIT_PER_KIND),
      supabase
        .from("contracts")
        .select("id, title, contract_number, status, client_email")
        .or(`title.ilike.${pattern},contract_number.ilike.${pattern},client_email.ilike.${pattern}`)
        .limit(LIMIT_PER_KIND),
      supabase
        .from("contract_payments")
        .select("id, invoice_number, amount, status")
        .ilike("invoice_number", pattern)
        .limit(LIMIT_PER_KIND),
      supabase
        .from("proposals")
        .select("id, title, status, client_email")
        .or(`title.ilike.${pattern},client_email.ilike.${pattern}`)
        .limit(LIMIT_PER_KIND),
    ])

  const hits: SearchHit[] = []

  for (const c of (clientsRes.data ?? []) as Array<{ id: string; name: string; email: string | null; company_name: string | null }>) {
    hits.push({
      id: `client:${c.id}`,
      kind: "client",
      label: c.name,
      subtitle: c.company_name ?? c.email ?? undefined,
      href: `/clients/${c.id}`,
    })
  }
  for (const p of (projectsRes.data ?? []) as Array<{ id: string; title: string; status: string }>) {
    hits.push({
      id: `project:${p.id}`,
      kind: "project",
      label: p.title,
      subtitle: p.status,
      href: `/projects/${p.id}`,
    })
  }
  for (const c of (contractsRes.data ?? []) as Array<{ id: string; title: string; contract_number: string | null; status: string; client_email: string | null }>) {
    hits.push({
      id: `contract:${c.id}`,
      kind: "contract",
      label: c.title,
      subtitle: c.contract_number ?? c.client_email ?? c.status,
      href: `/contracts/${c.id}`,
    })
  }
  for (const inv of (invoicesRes.data ?? []) as Array<{ id: string; invoice_number: string | null; amount: number; status: string }>) {
    hits.push({
      id: `invoice:${inv.id}`,
      kind: "invoice",
      label: inv.invoice_number ?? "Draft invoice",
      subtitle: `${inv.status} · $${Number(inv.amount).toLocaleString()}`,
      href: `/invoices/${inv.id}`,
    })
  }
  for (const pr of (proposalsRes.data ?? []) as Array<{ id: string; title: string; status: string; client_email: string | null }>) {
    hits.push({
      id: `proposal:${pr.id}`,
      kind: "proposal",
      label: pr.title,
      subtitle: pr.client_email ?? pr.status,
      href: `/proposals/${pr.id}`,
    })
  }

  return NextResponse.json({ hits })
}
