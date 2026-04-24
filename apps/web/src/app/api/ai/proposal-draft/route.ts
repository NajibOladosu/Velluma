import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { draftProposal, type ProposalDraftInput } from "@/lib/ai/assistant"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: Partial<ProposalDraftInput> = {}
  try { body = await request.json() } catch {}

  if (!body.clientName || !body.projectTitle || !body.scope) {
    return NextResponse.json({ error: "clientName, projectTitle, scope required" }, { status: 400 })
  }

  try {
    const draft = await draftProposal(body as ProposalDraftInput)
    return NextResponse.json(draft)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
