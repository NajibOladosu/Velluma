/**
 * GET  /api/contracts/[id]/messages — freelancer reads conversation
 * POST /api/contracts/[id]/messages — freelancer sends a message
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"

async function ensureConversation(supabase: Awaited<ReturnType<typeof createServiceClient>>, contractId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("contract_conversations")
    .select("id")
    .eq("contract_id", contractId)
    .maybeSingle()
  if (existing) return existing.id
  const { data, error } = await supabase
    .from("contract_conversations")
    .insert({ contract_id: contractId, last_message_at: new Date().toISOString() })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contractId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Ownership via RLS
  const { data: contract } = await supabase.from("contracts").select("id").eq("id", contractId).maybeSingle()
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const service = await createServiceClient()
  const { data: convo } = await service.from("contract_conversations").select("id").eq("contract_id", contractId).maybeSingle()
  if (!convo) return NextResponse.json({ data: [] })

  const { data, error } = await service
    .from("contract_messages")
    .select("id, sender_id, sender_role, sender_email, sender_name, message, created_at, attachment_url, attachment_name")
    .eq("conversation_id", convo.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contractId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { message?: string } = {}
  try { body = await request.json() } catch { /* ok */ }
  const text = body.message?.trim()
  if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 })

  // Ownership check
  const { data: contract } = await supabase.from("contracts").select("id").eq("id", contractId).maybeSingle()
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const service = await createServiceClient()
  const conversationId = await ensureConversation(service, contractId)

  const { data, error } = await service
    .from("contract_messages")
    .insert({
      conversation_id: conversationId,
      contract_id: contractId,
      sender_id: user.id,
      sender_role: "freelancer",
      sender_name: (user.user_metadata?.full_name as string) ?? user.email,
      sender_email: user.email,
      message: text,
      message_type: "text",
    })
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await service
    .from("contract_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId)

  return NextResponse.json({ data }, { status: 201 })
}
