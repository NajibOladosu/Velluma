import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/utils/supabase/server"

/**
 * Stripe webhook handler.
 *
 * Listens for events that the application must react to:
 * - payment_intent.succeeded / payment_intent.payment_failed
 * - transfer.created
 * - account.updated (Connect onboarding complete)
 * - customer.subscription.* (subscription lifecycle)
 * - charge.dispute.created / charge.dispute.closed
 *
 * Set STRIPE_WEBHOOK_SECRET in your environment.
 * Register this URL in the Stripe Dashboard:
 *   https://dashboard.stripe.com/webhooks → add endpoint → /api/webhooks/stripe
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe keys not configured" },
      { status: 500 },
    )
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-02-24" as any,
  })

  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("Stripe signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Service-role client used here because webhooks are server-only system operations
  // and there is no user session in this context.
  const supabase = await createServiceClient()

  // ── Idempotency guard ────────────────────────────────────────────────────
  // Insert the event_id before processing. If the row already exists the
  // UNIQUE constraint returns a conflict — meaning Stripe is retrying an event
  // we already handled. Return 200 immediately to stop retries.
  const { error: dedupError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id:   event.id,
      event_type: event.type,
      data:       event.data.object as unknown as Record<string, unknown>,
    })

  if (dedupError) {
    if (dedupError.code === "23505") {
      // Unique violation — already processed
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Unexpected DB error — log but continue processing to avoid losing the event
    console.error("stripe_webhook_events insert error:", dedupError)
  }

  try {
    switch (event.type) {
      // ── Payment intents ─────────────────────────���──────────────────────────
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent
        const milestoneId = intent.metadata?.milestoneId
        if (milestoneId) {
          await supabase
            .from("escrow_ledger")
            .update({ status: "funded", funded_at: new Date().toISOString() })
            .eq("stripe_charge_id", intent.id)
        }
        break
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent
        const milestoneId = intent.metadata?.milestoneId
        if (milestoneId) {
          await supabase
            .from("escrow_ledger")
            .update({
              status: "failed",
              failure_reason: intent.last_payment_error?.message ?? "Unknown",
            })
            .eq("stripe_charge_id", intent.id)
        }
        break
      }

      // ── Stripe Connect account updates ──────────────────────────────────���─
      case "account.updated": {
        const account = event.data.object as Stripe.Account
        const chargesEnabled = account.charges_enabled
        const payoutsEnabled = account.payouts_enabled

        await supabase
          .from("connected_accounts")
          .update({
            charges_enabled: chargesEnabled,
            payouts_enabled: payoutsEnabled,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id)

        break
      }

      // ── Subscription lifecycle ─────────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from("user_subscriptions")
          .update({
            status: sub.status,
            current_period_start: new Date(
              (sub as any).current_period_start * 1000,
            ).toISOString(),
            current_period_end: new Date(
              (sub as any).current_period_end * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id)

        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            cancel_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id)

        break
      }

      // ── Disputes ──────────────────────────────────────────────────────────
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute
        // Record dispute so the freelancer and admin can respond
        await supabase.from("audit_logs").insert({
          action: "dispute_opened",
          resource_type: "stripe_dispute",
          resource_id: dispute.id,
          metadata: {
            charge_id: dispute.charge,
            amount: dispute.amount,
            reason: dispute.reason,
            status: dispute.status,
          },
          severity: "warning",
        })
        break
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute
        await supabase.from("audit_logs").insert({
          action: "dispute_closed",
          resource_type: "stripe_dispute",
          resource_id: dispute.id,
          metadata: {
            charge_id: dispute.charge,
            outcome: dispute.status, // won / lost / under_review
          },
          severity: "info",
        })
        break
      }

      // ── Subscription payment events ────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        if ((invoice as any).subscription) {
          await supabase
            .from("user_subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", (invoice as any).subscription)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        if ((invoice as any).subscription) {
          await supabase
            .from("user_subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", (invoice as any).subscription)
        }
        break
      }

      default:
        // Unhandled event type — not an error, just not relevant
        break
    }
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}:`, err)
    // Return 200 so Stripe doesn't keep retrying; log the error for investigation.
    return NextResponse.json(
      { received: true, error: "Handler error — check server logs" },
      { status: 200 },
    )
  }

  return NextResponse.json({ received: true })
}
