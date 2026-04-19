/**
 * POST /api/portal/contracts/[id]/sign
 *
 * Client-side contract signature. The caller must hold a valid portal session
 * cookie that includes this contract id in the allowlist.
 *
 * Body: { signedName: string }
 *
 * Records a row in contract_signatures (user_id intentionally null — client
 * has no Supabase account) and stamps contracts.signed_by_client.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { requirePortalSession, forbidden } from "@/lib/portal/guard"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contractId } = await params
  const guard = await requirePortalSession(request)
  if (guard.response) return guard.response
  if (!guard.allows("contract", contractId)) return forbidden()

  let body: { signedName?: string } = {}
  try { body = await request.json() } catch { /* empty ok */ }

  const signedName = body.signedName?.trim()
  if (!signedName) {
    return NextResponse.json({ error: "signedName is required" }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Verify contract exists and is in a signable state
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, status, signed_by_client, client_email")
    .eq("id", contractId)
    .maybeSingle()

  if (contractError || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 })
  }
  if (contract.signed_by_client) {
    return NextResponse.json({ error: "Already signed" }, { status: 409 })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const now = new Date().toISOString()

  // Insert signature record (user_id is null — client has no Supabase account)
  const { error: sigError } = await supabase.from("contract_signatures").insert({
    contract_id: contractId,
    user_id: null,
    signed_at: now,
    signer_role: "client",
    signed_name: signedName,
    signed_email: guard.session.email,
    signed_ip: ip,
    signature_type: "typed",
  })

  if (sigError) {
    return NextResponse.json({ error: sigError.message }, { status: 500 })
  }

  // Stamp signed_by_client on the contract
  const { error: updateError } = await supabase
    .from("contracts")
    .update({ signed_by_client: now, updated_at: now })
    .eq("id", contractId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, signedAt: now })
}
