/**
 * GET /api/portal/session — returns the authenticated client's email and
 * the list of engagements they can access. Used by the portal page to
 * render a switcher when a client holds links from multiple freelancers.
 *
 * POST /api/portal/session { action: "end" } — clears the cookie.
 */

import { NextResponse, type NextRequest } from "next/server"
import { PORTAL_SESSION_COOKIE } from "@/lib/portal/session"
import { requirePortalSession } from "@/lib/portal/guard"

export async function GET(request: NextRequest) {
  const guard = await requirePortalSession(request)
  if (guard.response) return guard.response

  return NextResponse.json({
    email: guard.session.email,
    engagements: guard.session.engagements,
    expiresAt: new Date(guard.session.exp * 1000).toISOString(),
  })
}

export async function POST(request: NextRequest) {
  let body: { action?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body = treat as end
  }

  if (body.action !== "end") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}
