import { NextResponse, type NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { createClient, createServiceClient } from "@/utils/supabase/server"
import { writeAudit, AuditEvents } from "@/lib/audit"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLES = ["admin", "member", "viewer"] as const

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { email?: string; role?: string } = {}
  try { body = await request.json() } catch {}

  const email = body.email?.trim().toLowerCase()
  const role = (body.role ?? "member") as (typeof ROLES)[number]

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 })
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 })
  }

  const service = await createServiceClient()

  const { data: existing } = await service
    .from("team_members")
    .select("id")
    .eq("owner_id", user.id)
    .eq("email", email)
    .eq("status", "active")
    .maybeSingle()
  if (existing) return NextResponse.json({ error: "already a member" }, { status: 409 })

  const token = randomBytes(24).toString("hex")
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error } = await service
    .from("team_invitations")
    .insert({
      owner_id: user.id,
      email,
      role,
      token,
      expires_at: expiresAt,
    })
    .select("id, email, role, token, expires_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    userId: user.id,
    action: AuditEvents.TeamInviteSent,
    resourceType: "team",
    resourceId: invite.id,
    details: { email, role },
    request,
  })

  const origin = new URL(request.url).origin
  return NextResponse.json({
    ...invite,
    accept_url: `${origin}/team/accept/${token}`,
  })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const service = await createServiceClient()
  await service
    .from("team_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id)

  return NextResponse.json({ ok: true })
}
