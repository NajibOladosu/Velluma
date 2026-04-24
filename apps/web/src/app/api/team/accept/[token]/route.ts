import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"
import { writeAudit, AuditEvents } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 })

  const service = await createServiceClient()
  const { data: invite } = await service
    .from("team_invitations")
    .select("id, owner_id, email, role, expires_at, accepted_at, revoked_at")
    .eq("token", token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: "invite not found" }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: "already accepted" }, { status: 409 })
  if (invite.revoked_at) return NextResponse.json({ error: "revoked" }, { status: 410 })
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 })
  }
  if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: "signed-in email does not match invite" }, { status: 403 })
  }

  const now = new Date().toISOString()

  const { error: upsertError } = await service
    .from("team_members")
    .upsert(
      {
        owner_id: invite.owner_id,
        user_id: user.id,
        email: invite.email,
        role: invite.role,
        status: "active",
        updated_at: now,
      },
      { onConflict: "owner_id,email" },
    )
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  await service.from("team_invitations").update({ accepted_at: now }).eq("id", invite.id)

  await writeAudit({
    userId: user.id,
    action: AuditEvents.TeamInviteAccepted,
    resourceType: "team",
    resourceId: invite.id,
    details: { email: invite.email, role: invite.role, owner_id: invite.owner_id },
    request,
  })

  return NextResponse.json({ ok: true })
}
