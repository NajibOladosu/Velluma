/**
 * POST /api/projects/[id]/tasks/reorder
 *
 * Bulk-update order_index (and optionally status) on multiple tasks at
 * once — drives within-column drag-to-reorder on the kanban.
 *
 * Body:
 *   { items: [{ id, order_index, status? }, ...] }
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

interface ReorderItem {
  id: string
  order_index: number
  status?: "todo" | "in_progress" | "review" | "done"
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { items?: ReorderItem[] } = {}
  try { body = await request.json() } catch { /* ok */ }
  const items = (body.items ?? []).filter(
    (i) => i && typeof i.id === "string" && Number.isFinite(i.order_index),
  )
  if (items.length === 0) {
    return NextResponse.json({ error: "items[] required" }, { status: 400 })
  }

  // Project ownership check via RLS — one read confirms scope.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // PATCH each item. Sequential is fine — kanban columns rarely exceed 50
  // rows. RLS scopes each update to caller-owned tasks under this project.
  const errors: string[] = []
  for (const item of items) {
    const patch: Record<string, unknown> = { order_index: item.order_index }
    if (item.status) patch.status = item.status
    const { error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", item.id)
      .eq("project_id", projectId)
    if (error) errors.push(`${item.id}: ${error.message}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: items.length })
}
