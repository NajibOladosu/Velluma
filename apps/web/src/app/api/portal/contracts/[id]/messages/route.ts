/**
 * GET  /api/portal/contracts/[id]/messages — list messages for the conversation
 * POST /api/portal/contracts/[id]/messages — client sends a message
 *
 * Reads the scoped portal session cookie. The conversation is created lazily
 * if it doesn't exist yet for this contract.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { requirePortalSession, forbidden } from "@/lib/portal/guard"

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contractId } = await params
  const guard = await requirePortalSession(request)
  if (guard.response) return guard.response
  if (!guard.allows("contract", contractId)) return forbidden()

  const supabase = await createServiceClient()
  const { data: convo } = await supabase
    .from("contract_conversations")
    .select("id")
    .eq("contract_id", contractId)
    .maybeSingle()

  if (!convo) return NextResponse.json({ data: [] })

  const { data, error } = await supabase
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
  const guard = await requirePortalSession(request)
  if (guard.response) return guard.response
  if (!guard.allows("contract", contractId)) return forbidden()

  let body: { message?: string } = {}
  try { body = await request.json() } catch { /* ok */ }
  const text = body.message?.trim()
  if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const supabase = await createServiceClient()
  const conversationId = await ensureConversation(supabase, contractId)

  const { data, error } = await supabase
    .from("contract_messages")
    .insert({
      conversation_id: conversationId,
      contract_id: contractId,
      sender_id: null,
      sender_role: "client",
      sender_email: guard.session.email,
      message: text,
      message_type: "text",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from("contract_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId)

  return NextResponse.json({ data }, { status: 201 })
}
