import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { PORTAL_SESSION_COOKIE, verifyPortalSession } from "@/lib/portal/session"

/**
 * Middleware — runs on every matching request.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie so it doesn't expire mid-session.
 * 2. Protect all routes under /(dashboard) — redirect unauthenticated users to /login.
 * 3. Redirect authenticated users away from /login back to /dashboard.
 * 4. Protect /portal routes — require a scoped portal session cookie
 *    (set by /pt/[token]). No password sign-in for clients.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not write any logic between createServerClient and
  // supabase.auth.getUser(). A small mistake could leave users permanently
  // logged out. See: https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // --- Protect dashboard routes ---
  const isDashboardRoute = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/contracts") ||
    pathname.startsWith("/proposals") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/pipeline") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/time") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/automations") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/profitability") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/booking-settings") ||
    pathname.startsWith("/lead-forms") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings")

  if (isDashboardRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /p/[id] is the public client-facing proposal view — no auth required
  if (pathname.startsWith("/p/")) {
    return supabaseResponse
  }

  // /pt/[token] is the share-link redeem route — no auth required; the
  // handler validates the token and sets the portal session cookie itself.
  if (pathname.startsWith("/pt/")) {
    return supabaseResponse
  }

  // /book/[slug] is the public booking page; /f/[slug] is the public lead form.
  if (pathname.startsWith("/book/") || pathname.startsWith("/f/")) {
    return supabaseResponse
  }

  // --- Portal routes — scoped cookie, no sign-in screen ---
  // Clients arrive via a share link (/pt/[token]) which sets
  // velluma_portal_session. Certain sub-paths are always public:
  //   /portal/unavailable — shown when a link is invalid / expired / revoked
  const isPortalRoute = pathname.startsWith("/portal")
  const isPortalPublic =
    pathname === "/portal/unavailable" || pathname.startsWith("/portal/unavailable")

  if (isPortalRoute && !isPortalPublic) {
    const raw = request.cookies.get(PORTAL_SESSION_COOKIE)?.value
    const portalSession = await verifyPortalSession(raw)
    if (!portalSession || portalSession.engagements.length === 0) {
      const url = request.nextUrl.clone()
      url.pathname = "/portal/unavailable"
      url.search = "?reason=no-session"
      return NextResponse.redirect(url)
    }
  }

  // --- Redirect logged-in users away from auth pages ---
  const isAuthRoute = pathname === "/login" || pathname === "/signup" || pathname === "/"

  if (isAuthRoute && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.searchParams.delete("redirectTo")
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /api routes (handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api).*)",
  ],
}
