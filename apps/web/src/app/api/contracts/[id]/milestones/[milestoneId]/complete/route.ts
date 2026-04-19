/**
 * POST /api/contracts/[id]/milestones/[milestoneId]/complete
 *
 * Freelancer marks a milestone as completed. Requires the freelancer to own
 * the contract. Updates milestones.status = 'completed'.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  const { id: contractId, milestoneId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify ownership via RLS — if the select returns nothing the user doesn't own it
  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .maybeSingle()
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

  const service = await createServiceClient()
  const { error } = await service
    .from("milestones")
    .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", milestoneId)
    .eq("contract_id", contractId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
