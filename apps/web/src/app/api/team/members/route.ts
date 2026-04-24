import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"
import { writeAudit, AuditEvents } from "@/lib/audit"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const [members, invites] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, email, role, status, user_id, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("team_invitations")
      .select("id, email, role, token, expires_at, accepted_at, revoked_at, created_at")
      .eq("owner_id", user.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ])

  return NextResponse.json({
    members: members.data ?? [],
    invitations: invites.data ?? [],
  })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get("id")
  if (!memberId) return NextResponse.json({ error: "id required" }, { status: 400 })

  const service = await createServiceClient()
  const { data: member } = await service
    .from("team_members")
    .select("id, email, owner_id")
    .eq("id", memberId)
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 })

  await service
    .from("team_members")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", memberId)

  await writeAudit({
    userId: user.id,
    action: AuditEvents.TeamMemberRemoved,
    resourceType: "team",
    resourceId: memberId,
    details: { email: member.email },
    severity: "warning",
    request,
  })

  return NextResponse.json({ ok: true })
}
