/**
 * POST /api/bulk/[resource]
 * Body: { ids: string[], action: "approve" | "reject" | "delete" }
 * Resources: time | expenses
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { writeAudit } from "@/lib/audit"

const RESOURCES = ["time", "expenses"] as const
type Resource = (typeof RESOURCES)[number]

const TABLE: Record<Resource, string> = {
  time: "time_entries",
  expenses: "expenses",
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params
  if (!(RESOURCES as readonly string[]).includes(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 400 })
  }
  const r = resource as Resource

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { ids?: string[]; action?: string } = {}
  try { body = await request.json() } catch {}
  const ids = (body.ids ?? []).filter((x) => typeof x === "string")
  const action = body.action
  if (ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 })
  if (ids.length > 500) return NextResponse.json({ error: "max 500 ids" }, { status: 400 })
  if (!["approve", "reject", "delete"].includes(action ?? "")) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  const table = TABLE[r]
  const now = new Date().toISOString()
  let error: { message: string } | null = null
  let count = 0

  if (action === "delete") {
    const res = await supabase.from(table).delete({ count: "exact" }).in("id", ids)
    error = res.error
    count = res.count ?? 0
  } else if (action === "approve") {
    const res = await supabase
      .from(table)
      .update({ status: "approved", approved_at: now, approved_by: user.id }, { count: "exact" })
      .in("id", ids)
    error = res.error
    count = res.count ?? 0
  } else {
    const res = await supabase
      .from(table)
      .update({ status: "rejected" }, { count: "exact" })
      .in("id", ids)
    error = res.error
    count = res.count ?? 0
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    userId: user.id,
    action: `${resource}.bulk_${action}`,
    resourceType: resource,
    resourceId: `bulk-${ids.length}`,
    details: { ids, count },
    request,
  })

  return NextResponse.json({ ok: true, count })
}
