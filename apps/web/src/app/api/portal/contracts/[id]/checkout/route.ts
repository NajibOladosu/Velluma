/**
 * POST /api/portal/contracts/[id]/checkout
 *
 * Creates a Stripe Checkout session for the client to pay the escrow deposit.
 * Requires a valid portal session cookie with this contract in the allowlist.
 *
 * Body: { successUrl?: string, cancelUrl?: string }
 * Response: { checkoutUrl: string }
 */
import { NextResponse, type NextRequest } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/utils/supabase/server"
import { requirePortalSession, forbidden } from "@/lib/portal/guard"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contractId } = await params
  const guard = await requirePortalSession(request)
  if (guard.response) return guard.response
  if (!guard.allows("contract", contractId)) return forbidden()

  const supabase = await createServiceClient()
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, title, total_amount, currency, signed_by_client, is_funded, client_email")
    .eq("id", contractId)
    .maybeSingle()

  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 })
  }
  if (!contract.signed_by_client) {
    return NextResponse.json({ error: "Contract must be signed before payment" }, { status: 400 })
  }
  if (contract.is_funded) {
    return NextResponse.json({ error: "Contract already funded" }, { status: 409 })
  }

  const origin = request.headers.get("x-forwarded-origin") ?? new URL(request.url).origin
  let body: { successUrl?: string; cancelUrl?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  const amountCents = Math.round(Number(contract.total_amount ?? 0) * 100)
  if (amountCents < 50) {
    return NextResponse.json({ error: "Contract amount too low for payment" }, { status: 400 })
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: guard.session.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (contract.currency ?? "usd").toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: contract.title,
            description: "Escrow deposit — held securely until project completion.",
          },
        },
      },
    ],
    payment_intent_data: {
      metadata: {
        contract_id: contractId,
        client_email: guard.session.email,
        type: "escrow_deposit",
      },
      capture_method: "automatic",
    },
    metadata: {
      contract_id: contractId,
      client_email: guard.session.email,
    },
    success_url:
      body.successUrl ??
      `${origin}/portal?payment=success&contract=${contractId}`,
    cancel_url:
      body.cancelUrl ??
      `${origin}/portal?payment=cancelled&contract=${contractId}`,
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
