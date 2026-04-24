import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const patch: Record<string, unknown> = {}
  if (typeof body.name === "string") patch.name = body.name
  if (typeof body.description === "string") patch.description = body.description
  if (typeof body.category === "string") patch.category = body.category
  if (body.content !== undefined) patch.content = body.content
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active

  const { data, error } = await supabase
    .from("document_templates")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("document_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
