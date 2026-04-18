/**
 * GET /pt/[token]
 *
 * Redeems a freelancer-issued share link. Validates the token, upserts
 * the scoped portal session cookie, and redirects to the engagement view.
 *
 * If the client already holds a session cookie for the SAME email, the new
 * engagement is merged into the existing allowlist (multi-freelancer
 * unification). Otherwise a fresh session replaces any prior one.
 *
 * This route sits outside the (portal) group so portal middleware does not
 * gate it — clients land here BEFORE having a session.
 */

import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import {
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_MAX_AGE,
  mergeEngagement,
  signPortalSession,
  verifyPortalSession,
  type PortalEngagementType,
} from "@/lib/portal/session"

interface TokenRow {
  id: string
  client_email: string
  engagement_type: PortalEngagementType
  engagement_id: string
  expires_at: string
  revoked_at: string | null
  use_count: number
}

function errorRedirect(req: NextRequest, reason: string) {
  const url = req.nextUrl.clone()
  url.pathname = "/portal/unavailable"
  url.search = `?reason=${encodeURIComponent(reason)}`
  return NextResponse.redirect(url)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    return errorRedirect(request, "invalid-link")
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("portal_access_tokens")
    .select(
      "id, client_email, engagement_type, engagement_id, expires_at, revoked_at, use_count",
    )
    .eq("token", token)
    .maybeSingle<TokenRow>()

  if (error || !data) {
    return errorRedirect(request, "invalid-link")
  }

  if (data.revoked_at) {
    return errorRedirect(request, "revoked")
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return errorRedirect(request, "expired")
  }

  // Record usage — best-effort, don't fail the redeem on it.
  void supabase
    .from("portal_access_tokens")
    .update({
      last_used_at: new Date().toISOString(),
      use_count: data.use_count + 1,
    })
    .eq("id", data.id)

  // Merge into any existing session for the same email.
  const existingRaw = request.cookies.get(PORTAL_SESSION_COOKIE)?.value
  const existing = await verifyPortalSession(existingRaw)
  const payload = mergeEngagement(existing, {
    email: data.client_email,
    engagement: {
      type: data.engagement_type,
      id: data.engagement_id,
    },
  })

  const cookieValue = await signPortalSession(payload)

  const destination = destinationFor(data.engagement_type, data.engagement_id)
  const url = request.nextUrl.clone()
  url.pathname = destination
  url.search = ""

  const response = NextResponse.redirect(url)
  response.cookies.set(PORTAL_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PORTAL_SESSION_MAX_AGE,
  })
  return response
}

function destinationFor(type: PortalEngagementType, id: string): string {
  // Proposals keep their existing public-style view. Contracts + projects
  // land in the unified /portal dashboard, which reads the allowlist from
  // the session cookie and renders the relevant engagement.
  if (type === "proposal") return `/p/${id}`
  return "/portal"
}
