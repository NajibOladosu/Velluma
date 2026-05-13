/**
 * GET  /api/clients/[id]/messages  — list messages in the client thread
 * POST /api/clients/[id]/messages  — send a message in the client thread
 *
 * Client-anchored conversations: one thread per (tenant, client[, project]).
 * The legacy /api/contracts/[id]/messages route still works for clients that
 * arrive via a contract-share link.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"

async function ensureClientConversation(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  tenantId: string,
  clientId: string,
): Promise<string> {
  // Look up existing project-less thread first.
  const { data: existing } = await service
    .from("contract_conversations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("client_id", clientId)
    .is("project_id", null)
    .maybeSingle()
  if (existing) return existing.id

  const { data: client } = await service
    .from("crm_clients")
    .select("name, email")
    .eq("id", clientId)
    .maybeSingle()

  const { data, error } = await service
    .from("contract_conversations")
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      subject: client?.name ?? client?.email ?? "Client",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

async function assertClientOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("crm_clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle()
  return Boolean(data)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await assertClientOwnership(supabase, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const service = await createServiceClient()
  const { data: convo } = await service
    .from("contract_conversations")
    .select("id")
    .eq("tenant_id", user.id)
    .eq("client_id", clientId)
    .is("project_id", null)
    .maybeSingle()
  if (!convo) return NextResponse.json({ data: [], conversationId: null })

  const { data, error } = await service
    .from("contract_messages")
    .select(
      "id, sender_id, sender_role, sender_email, sender_name, message, " +
        "created_at, attachment_url, attachment_name",
    )
    .eq("conversation_id", convo.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, conversationId: convo.id })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await assertClientOwnership(supabase, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: { message?: string } = {}
  try { body = await request.json() } catch { /* ok */ }
  const text = body.message?.trim()
  if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const service = await createServiceClient()
  const conversationId = await ensureClientConversation(service, user.id, clientId)

  const { data, error } = await service
    .from("contract_messages")
    .insert({
      conversation_id: conversationId,
      // contract_id intentionally null — this thread is client-scoped, not
      // bound to a single contract. Schema relaxed in 20260512140000.
      contract_id: null,
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
