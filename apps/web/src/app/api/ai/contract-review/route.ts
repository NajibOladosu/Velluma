import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { reviewContract } from "@/lib/ai/assistant"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { contractText?: string; perspective?: "freelancer" | "client" } = {}
  try { body = await request.json() } catch {}

  const text = body.contractText?.trim()
  if (!text || text.length < 50) {
    return NextResponse.json({ error: "contractText (min 50 chars) required" }, { status: 400 })
  }

  try {
    const review = await reviewContract({ contractText: text, perspective: body.perspective })
    return NextResponse.json(review)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
