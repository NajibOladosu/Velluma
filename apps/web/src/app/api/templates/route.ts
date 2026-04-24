import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

const CATEGORIES = ["proposal", "contract", "invoice", "email", "brief", "other"] as const

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  let q = supabase
    .from("document_templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })

  if (category) q = q.eq("category", category)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { name?: string; description?: string; category?: string; content?: unknown } = {}
  try { body = await request.json() } catch {}

  const name = body.name?.trim()
  const category = (body.category ?? "proposal") as (typeof CATEGORIES)[number]
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("document_templates")
    .insert({
      user_id: user.id,
      name,
      description: body.description?.trim() || null,
      category,
      content: body.content ?? {},
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
