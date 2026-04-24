import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500)
  const resourceType = searchParams.get("resource_type")
  const action = searchParams.get("action")
  const before = searchParams.get("before")

  let query = supabase
    .from("audit_logs")
    .select("id, user_id, action, resource_type, resource_id, details, metadata, severity, success, error_message, ip_address, user_agent, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (resourceType) query = query.eq("resource_type", resourceType)
  if (action) query = query.eq("action", action)
  if (before) query = query.lt("created_at", before)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data ?? [] })
}
