/**
 * Server-side guards for portal API routes. Each handler should:
 *   const guard = await requirePortalSession(request)
 *   if (guard.response) return guard.response
 *   // now: guard.session is verified
 *
 * And for endpoints scoped to a specific engagement:
 *   const allowed = guard.allows("contract", contractId)
 *   if (!allowed) return forbidden()
 */

import { NextResponse, type NextRequest } from "next/server"
import {
  PORTAL_SESSION_COOKIE,
  sessionAllows,
  verifyPortalSession,
  type PortalEngagementType,
  type PortalSessionPayload,
} from "./session"

export interface PortalGuard {
  session: PortalSessionPayload
  allows: (type: PortalEngagementType, id: string) => boolean
  /** All contract ids in the allowlist (useful for list endpoints). */
  contractIds: string[]
  /** All proposal ids (= project ids) in the allowlist. */
  proposalIds: string[]
  response?: undefined
}

export interface PortalGuardDenied {
  session?: undefined
  allows?: undefined
  contractIds?: undefined
  proposalIds?: undefined
  response: NextResponse
}

export async function requirePortalSession(
  request: NextRequest | Request,
): Promise<PortalGuard | PortalGuardDenied> {
  const cookieHeader =
    "cookies" in request && typeof (request as NextRequest).cookies?.get === "function"
      ? (request as NextRequest).cookies.get(PORTAL_SESSION_COOKIE)?.value
      : extractCookie(request.headers.get("cookie"), PORTAL_SESSION_COOKIE)

  const session = await verifyPortalSession(cookieHeader)
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "Portal session missing or invalid" },
        { status: 401 },
      ),
    }
  }

  const contractIds = session.engagements
    .filter((e) => e.type === "contract")
    .map((e) => e.id)
  const proposalIds = session.engagements
    .filter((e) => e.type === "proposal")
    .map((e) => e.id)

  return {
    session,
    allows: (type, id) => sessionAllows(session, type, id),
    contractIds,
    proposalIds,
  }
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function extractCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return rest.join("=")
  }
  return undefined
}
