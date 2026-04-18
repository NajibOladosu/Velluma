import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { requirePortalSession, forbidden } from "@/lib/portal/guard"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const guard = await requirePortalSession(request)
  if (guard.response) return guard.response
  if (!guard.allows("contract", id)) return forbidden()

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("contract_escrows")
    .select("id, funded_amount, currency, status, funded_at, released_at")
    .eq("contract_id", id)
    .order("funded_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}
