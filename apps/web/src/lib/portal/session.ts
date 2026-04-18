/**
 * Portal session — a signed cookie representing a client's scoped access.
 *
 * Clients don't have Supabase accounts; they arrive via a freelancer-issued
 * share link (see /pt/[token]), which sets this cookie. The cookie lists
 * every engagement (proposal / contract / project) the bearer can view.
 *
 * Uses the Web Crypto API so the same module works in Edge (middleware)
 * and Node (route handlers). Signing is async as a result.
 *
 * Env:
 * - PORTAL_SESSION_SECRET must be set in production. We fall back to a
 *   deterministic dev secret so local bootstrapping doesn't break.
 */

export const PORTAL_SESSION_COOKIE = "velluma_portal_session"
export const PORTAL_SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export type PortalEngagementType = "proposal" | "contract" | "project"

export interface PortalEngagement {
  type: PortalEngagementType
  id: string
}

export interface PortalSessionPayload {
  /** Client email the session was issued to. */
  email: string
  /** Engagements the bearer is allowed to view. */
  engagements: PortalEngagement[]
  /** Issued-at epoch seconds. */
  iat: number
  /** Expires-at epoch seconds. */
  exp: number
}

function secret(): string {
  const s = process.env.PORTAL_SESSION_SECRET
  if (s && s.length >= 32) return s
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PORTAL_SESSION_SECRET is required in production (min 32 chars).",
    )
  }
  // Deterministic dev fallback — NEVER used in production.
  return "velluma-dev-portal-secret-do-not-use-in-production"
}

/* ── base64url helpers (no Buffer — Edge-safe) ─────────────────── */

function b64urlEncode(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function b64urlDecodeToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : ""
  const binary = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function b64urlDecodeToString(s: string): string {
  return new TextDecoder().decode(b64urlDecodeToBytes(s))
}

/* ── HMAC via Web Crypto ──────────────────────────────────────── */

let keyPromise: Promise<CryptoKey> | null = null
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    )
  }
  return keyPromise
}

async function signBody(body: string): Promise<string> {
  const key = await getKey()
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  )
  return b64urlEncode(new Uint8Array(mac))
}

async function verifyBody(body: string, sig: string): Promise<boolean> {
  const key = await getKey()
  const sigBytes = b64urlDecodeToBytes(sig)
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as unknown as BufferSource,
    new TextEncoder().encode(body),
  )
}

/* ── Public API ───────────────────────────────────────────────── */

/** Serialize and sign a session payload into a cookie-safe string. */
export async function signPortalSession(
  payload: PortalSessionPayload,
): Promise<string> {
  const body = b64urlEncode(JSON.stringify(payload))
  const sig = await signBody(body)
  return `${body}.${sig}`
}

/** Verify a signed session string. Returns payload if valid, null otherwise. */
export async function verifyPortalSession(
  raw: string | undefined | null,
): Promise<PortalSessionPayload | null> {
  if (!raw) return null
  const dot = raw.indexOf(".")
  if (dot < 0) return null

  const body = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)

  let ok = false
  try {
    ok = await verifyBody(body, sig)
  } catch {
    return null
  }
  if (!ok) return null

  let payload: PortalSessionPayload
  try {
    payload = JSON.parse(b64urlDecodeToString(body))
  } catch {
    return null
  }

  if (typeof payload.exp !== "number" || Date.now() / 1000 > payload.exp) return null
  if (!Array.isArray(payload.engagements)) return null

  return payload
}

/**
 * Merge a new engagement into an existing session payload (if the email
 * matches) or return a fresh payload. Used by the redeem flow so a client
 * who holds links from multiple freelancers sees all of them in one portal.
 */
export function mergeEngagement(
  existing: PortalSessionPayload | null,
  add: {
    email: string
    engagement: PortalEngagement
    ttlSeconds?: number
  },
): PortalSessionPayload {
  const ttl = add.ttlSeconds ?? PORTAL_SESSION_MAX_AGE
  const now = Math.floor(Date.now() / 1000)

  if (!existing || existing.email.toLowerCase() !== add.email.toLowerCase()) {
    return {
      email: add.email.toLowerCase(),
      engagements: [add.engagement],
      iat: now,
      exp: now + ttl,
    }
  }

  const key = `${add.engagement.type}:${add.engagement.id}`
  const has = existing.engagements.some((e) => `${e.type}:${e.id}` === key)
  const engagements = has
    ? existing.engagements
    : [...existing.engagements, add.engagement]

  return {
    email: existing.email,
    engagements,
    iat: existing.iat,
    exp: now + ttl, // refresh expiry on each redeem
  }
}

/** True when the session grants access to this specific engagement. */
export function sessionAllows(
  session: PortalSessionPayload | null,
  type: PortalEngagementType,
  id: string,
): boolean {
  if (!session) return false
  return session.engagements.some((e) => e.type === type && e.id === id)
}
