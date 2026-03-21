"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { H1, Muted, P } from "@/components/ui/typography"
import { Surface } from "@/components/ui/surface"
import { Separator } from "@/components/ui/separator"
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react"

type Step = "details" | "verify"

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>("details")
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        // OAuth callback will exchange the code and redirect to /dashboard
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    // If email confirmation is enabled in Supabase, show verification step
    setStep("verify")
    setIsLoading(false)
  }

  async function handleGoogleSignUp() {
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  // ─── Step 2: Verify email ───────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-zinc-900 mx-auto">
            <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <H1 className="text-2xl tracking-tight">Check your email</H1>
            <Muted className="text-sm leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="font-semibold text-zinc-900">{email}</span>.
              Click it to activate your account.
            </Muted>
          </div>
          <Surface className="p-6 space-y-4">
            <Muted className="text-xs leading-relaxed">
              Didn&apos;t receive it? Check your spam folder or{" "}
            </Muted>
            <Button
              variant="outline"
              className="w-full border-zinc-200 text-zinc-900 h-10 text-sm"
              onClick={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend email"}
            </Button>
          </Surface>
          <Muted className="text-xs">
            <Link href="/login" className="text-zinc-900 font-medium underline underline-offset-2 hover:text-zinc-700 transition-colors">
              Back to sign in
            </Link>
          </Muted>
        </div>
      </div>
    )
  }

  // ─── Step 1: Sign up form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand mark */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-zinc-900 mx-auto">
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <H1 className="text-2xl tracking-tight">Create your account</H1>
          <Muted className="text-sm">Start managing contracts and payments in minutes.</Muted>
        </div>

        <Surface className="p-6 space-y-5">
          {/* Google sign up */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-zinc-200 text-zinc-900 gap-2 h-10"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative flex items-center gap-3">
            <Separator className="flex-1 bg-zinc-100" />
            <Muted className="text-[10px] uppercase tracking-widest shrink-0">or</Muted>
            <Separator className="flex-1 bg-zinc-100" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700" htmlFor="fullName">
                Full name
              </label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 border-zinc-200 bg-white text-sm"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 border-zinc-200 bg-white text-sm"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 border-zinc-200 bg-white text-sm"
                minLength={8}
                required
              />
            </div>

            {error && (
              <P className="text-xs text-red-600 leading-snug border border-red-100 bg-red-50/50 rounded-md px-3 py-2">
                {error}
              </P>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </Surface>

        {/* Terms notice */}
        <Muted className="text-center text-[11px] leading-relaxed">
          By creating an account, you agree to Velluma&apos;s{" "}
          <a href="/legal/terms" className="text-zinc-900 font-medium underline underline-offset-2 hover:text-zinc-700 transition-colors">
            Terms
          </a>{" "}
          and{" "}
          <a href="/legal/privacy" className="text-zinc-900 font-medium underline underline-offset-2 hover:text-zinc-700 transition-colors">
            Privacy Policy
          </a>
          .
        </Muted>

        <Muted className="text-center text-[11px]">
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-900 font-medium underline underline-offset-2 hover:text-zinc-700 transition-colors">
            Sign in
          </Link>
        </Muted>
      </div>
    </div>
  )
}
