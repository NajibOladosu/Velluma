import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Middleware — runs on every matching request.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie so it doesn't expire mid-session.
 * 2. Protect all routes under /(dashboard) — redirect unauthenticated users to /login.
 * 3. Redirect authenticated users away from /login back to /dashboard.
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
    pathname.startsWith("/settings")

  if (isDashboardRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
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
     * - /portal routes (client-facing, protected separately via magic link)
     * - /api routes (handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|portal|api).*)",
  ],
}
