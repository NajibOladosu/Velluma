/**
 * POST /api/contracts/[id]/sign
 *
 * Freelancer signs their own contract from the dashboard.
 * Records a contract_signatures row + stamps contracts.signed_by_freelancer.
 *
 * Body: { signedName: string }
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"
import { writeAudit, AuditEvents } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contractId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { signedName?: string } = {}
  try { body = await request.json() } catch { /* ok */ }
  const signedName = body.signedName?.trim()
  if (!signedName) return NextResponse.json({ error: "signedName is required" }, { status: 400 })

  // Ownership check via RLS
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, signed_by_freelancer")
    .eq("id", contractId)
    .maybeSingle()
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })
  if (contract.signed_by_freelancer) return NextResponse.json({ error: "Already signed" }, { status: 409 })

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const now = new Date().toISOString()

  const service = await createServiceClient()
  const { error: sigError } = await service.from("contract_signatures").insert({
    contract_id: contractId,
    user_id: user.id,
    signed_at: now,
    signer_role: "freelancer",
    signed_name: signedName,
    signed_email: user.email ?? null,
    signed_ip: ip,
    signature_type: "typed",
  })
  if (sigError) return NextResponse.json({ error: sigError.message }, { status: 500 })

  const { error: updateError } = await service
    .from("contracts")
    .update({ signed_by_freelancer: now, updated_at: now })
    .eq("id", contractId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await writeAudit({
    userId: user.id,
    action: AuditEvents.ContractSigned,
    resourceType: "contract",
    resourceId: contractId,
    details: { signer_role: "freelancer", signed_name: signedName },
    request,
  })

  return NextResponse.json({ ok: true, signedAt: now })
}
