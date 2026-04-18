import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { requirePortalSession } from "@/lib/portal/guard"

export async function GET(request: NextRequest) {
  const guard = await requirePortalSession(request)
  if (guard.response) return guard.response

  if (guard.contractIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id, title, status, total_amount, currency, client_email, " +
        "signed_by_client, signed_by_freelancer, created_at, updated_at",
    )
    .in("id", guard.contractIds)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}
