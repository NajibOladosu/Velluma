import { createServerClient } from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * OAuth callback handler.
 * Handles both: Google OAuth redirect and magic link (OTP) verification.
 *
 * After exchange, redirects to:
 * - `next` query param (if provided and safe)
 * - /dashboard (default)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/dashboard"

  // Ensure redirect target is relative (prevent open redirect)
  const safeRedirect = next.startsWith("/") ? next : "/dashboard"
  const redirectTo = `${origin}${safeRedirect}`

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Handle PKCE code exchange (Google OAuth, GitHub …)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // Handle magic link / OTP verification
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // Auth failed — redirect to login with error
  const errorUrl = new URL("/login", origin)
  errorUrl.searchParams.set("error", "Authentication failed. Please try again.")
  return NextResponse.redirect(errorUrl)
}
