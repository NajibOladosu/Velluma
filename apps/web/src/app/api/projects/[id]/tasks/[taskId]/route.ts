/**
 * PATCH /api/projects/[id]/tasks/[taskId] — update status / title / etc.
 * DELETE /api/projects/[id]/tasks/[taskId] — delete a task
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id: projectId, taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* ok */ }

  const allowed = ["title", "description", "status", "priority", "due_date", "order_index"]
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id, title, status, priority, due_date, order_index")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id: projectId, taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
