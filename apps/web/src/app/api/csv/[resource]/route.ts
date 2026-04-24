/**
 * GET  /api/csv/[resource]?filters... → text/csv
 * POST /api/csv/[resource]            → bulk upsert (body: { rows: Record<string, string>[] })
 *
 * Supported resources: clients, time, expenses, invoices
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { toCsv } from "@/lib/csv"
import { writeAudit } from "@/lib/audit"

const RESOURCES = ["clients", "time", "expenses", "invoices"] as const
type Resource = (typeof RESOURCES)[number]

const TABLE_MAP: Record<Resource, { table: string; columns: string[]; userColumn?: string }> = {
  clients:  { table: "crm_clients",  columns: ["id","name","email","phone","company","status","created_at"] },
  time:     { table: "time_entries", columns: ["id","contract_id","description","duration_minutes","hourly_rate","entry_date","created_at"] },
  expenses: { table: "expenses",     columns: ["id","contract_id","category","amount","currency","description","incurred_at","status","created_at"] },
  invoices: { table: "contract_payments", columns: ["id","contract_id","amount","currency","status","invoice_number","issued_at","due_at","paid_at","created_at"] },
}

function isResource(s: string): s is Resource {
  return (RESOURCES as readonly string[]).includes(s)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params
  if (!isResource(resource)) return NextResponse.json({ error: "unknown resource" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const cfg = TABLE_MAP[resource]
  const { data, error } = await supabase.from(cfg.table).select(cfg.columns.join(","))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const csv = toCsv(rows, cfg.columns)

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${resource}-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params
  if (!isResource(resource)) return NextResponse.json({ error: "unknown resource" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { rows?: Array<Record<string, string>> } = {}
  try { body = await request.json() } catch {}
  const rows = body.rows ?? []
  if (rows.length === 0) return NextResponse.json({ error: "no rows" }, { status: 400 })
  if (rows.length > 1000) return NextResponse.json({ error: "max 1000 rows per import" }, { status: 400 })

  const cfg = TABLE_MAP[resource]
  let inserted = 0
  let failed = 0
  const errors: string[] = []

  // Per-resource normalization
  const normalized = rows.map((r) => normalizeRow(resource, r, user.id)).filter(Boolean) as Array<Record<string, unknown>>

  // Insert in batches of 100
  for (let i = 0; i < normalized.length; i += 100) {
    const chunk = normalized.slice(i, i + 100)
    const { error, count } = await supabase.from(cfg.table).insert(chunk, { count: "exact" })
    if (error) {
      failed += chunk.length
      errors.push(error.message)
    } else {
      inserted += count ?? chunk.length
    }
  }

  await writeAudit({
    userId: user.id,
    action: `${resource}.imported`,
    resourceType: resource,
    resourceId: `bulk-${Date.now()}`,
    details: { inserted, failed, total: rows.length, errors: errors.slice(0, 5) },
    success: failed === 0,
    severity: failed > 0 ? "warning" : "info",
    request,
  })

  return NextResponse.json({ inserted, failed, errors: errors.slice(0, 5) })
}

function normalizeRow(resource: Resource, raw: Record<string, string>, userId: string): Record<string, unknown> | null {
  const r: Record<string, unknown> = { ...raw }
  delete r.id
  delete r.created_at

  // Strip empty strings → null so DB defaults apply
  for (const k of Object.keys(r)) {
    if (r[k] === "") r[k] = null
  }

  switch (resource) {
    case "clients":
      if (!raw.name && !raw.email) return null
      r.user_id = userId
      return r
    case "time":
      if (!raw.contract_id) return null
      r.user_id = userId
      r.duration_minutes = Number(raw.duration_minutes || 0)
      r.hourly_rate = raw.hourly_rate ? Number(raw.hourly_rate) : null
      return r
    case "expenses":
      if (!raw.amount) return null
      r.user_id = userId
      r.amount = Number(raw.amount)
      return r
    case "invoices":
      if (!raw.contract_id || !raw.amount) return null
      r.amount = Number(raw.amount)
      return r
  }
}
