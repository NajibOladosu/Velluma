/**
 * GET  /api/projects/[id]/tasks — list tasks for a project
 * POST /api/projects/[id]/tasks — create a task
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, assignee_id, due_date, order_index, created_at")
    .eq("project_id", id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { title?: string; status?: string; priority?: string; due_date?: string; description?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  if (!body.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })

  // Get current max order_index
  const { data: maxRow } = await supabase
    .from("tasks")
    .select("order_index")
    .eq("project_id", projectId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      tenant_id: user.id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      due_date: body.due_date ?? null,
      order_index: (maxRow?.order_index ?? -1) + 1,
    })
    .select("id, title, description, status, priority, due_date, order_index")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
