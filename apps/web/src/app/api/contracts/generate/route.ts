/**
 * POST /api/contracts/generate
 *
 * Generates an AI contract via Gemini 2.0 Flash and persists it to Supabase.
 * This route is self-contained — it does not require the microservice stack.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import {
  generateContract,
  type ContractGenerationInput,
} from "@/lib/ai/contract-generator"

export async function POST(request: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── Input ───────────────────────────────────────────────────────────────
    const input: ContractGenerationInput = await request.json()

    if (!input.projectDescription?.trim() || !input.deliverables?.trim()) {
      return NextResponse.json(
        { error: "projectDescription and deliverables are required" },
        { status: 400 },
      )
    }

    // ── Generate via Gemini ─────────────────────────────────────────────────
    const generated = await generateContract(input)

    // ── Persist contract row ────────────────────────────────────────────────
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        creator_id: user.id,
        title: generated.title,
        description: generated.summary,
        status: "draft",
        ai_enhanced: true,
        original_description: input.projectDescription,
        content: { sections: generated.sections },
        total_amount: input.paymentType === "hourly" ? null : (input.totalAmount ?? null),
        currency: input.currency || "USD",
        client_email: input.clientEmail,
        generation_status: "completed",
        generation_metadata: {
          model: "gemini-2.0-flash",
          contractType: input.contractType,
          generatedAt: new Date().toISOString(),
          regeneration: Boolean(input.regenerateFeedback),
        },
      })
      .select()
      .single()

    if (contractError) {
      console.error("[/api/contracts/generate] Supabase insert error:", contractError)
      return NextResponse.json(
        { error: contractError.message },
        { status: 500 },
      )
    }

    // ── Persist initial document version (best-effort) ──────────────────────
    // This records the AI prompt and output for audit purposes.
    const { error: docError } = await supabase.from("contract_documents").insert({
      contract_id: contract.id,
      author_id: user.id,
      content: JSON.stringify({ sections: generated.sections }),
      source: "ai",
      ai_prompt: input.projectDescription,
      regen_number: 0,
    })

    if (docError) {
      // Non-fatal: contract is already created; document version is supplementary
      console.warn("[/api/contracts/generate] contract_documents insert failed:", docError.message)
    }

    // ── Return ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      contractId: contract.id,
      title: generated.title,
      summary: generated.summary,
      sections: generated.sections,
      metadata: generated.metadata,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contract generation failed"
    console.error("[/api/contracts/generate]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
