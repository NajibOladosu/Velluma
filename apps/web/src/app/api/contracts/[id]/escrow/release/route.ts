/**
 * POST /api/contracts/[id]/escrow/release
 *
 * Freelancer requests escrow release for a completed milestone (or full contract).
 * Body: { escrowId: string, milestoneId?: string }
 *
 * Updates contract_escrows.status = 'released' and escrow_ledger.status = 'released'.
 * In production this would trigger a Stripe transfer; here we mark it released and
 * the existing Stripe webhook flow can reconcile.
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

  let body: { escrowId?: string; milestoneId?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  if (!body.escrowId) return NextResponse.json({ error: "escrowId required" }, { status: 400 })

  // Ownership check via RLS
  const { data: contract } = await supabase.from("contracts").select("id, freelancer_id").eq("id", contractId).maybeSingle()
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

  const service = await createServiceClient()
  const now = new Date().toISOString()

  const { error: escrowError } = await service
    .from("contract_escrows")
    .update({ status: "released", released_at: now, released_to: user.id })
    .eq("id", body.escrowId)
    .eq("contract_id", contractId)
    .eq("status", "active")

  if (escrowError) return NextResponse.json({ error: escrowError.message }, { status: 500 })

  // Mirror in escrow_ledger if a matching row exists
  await service
    .from("escrow_ledger")
    .update({ status: "released", released_at: now, updated_at: now })
    .eq("contract_id", contractId)
    .eq("status", "held")
    .then(() => {}) // best-effort

  await writeAudit({
    userId: user.id,
    action: AuditEvents.EscrowReleased,
    resourceType: "escrow",
    resourceId: body.escrowId,
    details: { contract_id: contractId, milestone_id: body.milestoneId ?? null },
    severity: "warning",
    request,
  })

  return NextResponse.json({ ok: true })
}
