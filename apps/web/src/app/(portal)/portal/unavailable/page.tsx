import Link from "next/link"
import { ShieldCheck, Mail, Clock, Ban, LinkIcon } from "lucide-react"
import { H1, Muted, P } from "@/components/ui/typography"
import { Surface } from "@/components/ui/surface"

type Reason = "no-session" | "invalid-link" | "expired" | "revoked" | "unknown"

const COPY: Record<
  Reason,
  { icon: typeof Clock; title: string; body: string }
> = {
  "no-session": {
    icon: LinkIcon,
    title: "You'll need a link from your freelancer",
    body:
      "The Velluma client portal is opened through a personal share link. Ask the freelancer you're working with to send (or re-send) a new link to your email.",
  },
  "invalid-link": {
    icon: Ban,
    title: "This link isn't valid",
    body:
      "The URL may have been mistyped, or it was copied incompletely. Open the link directly from the email your freelancer sent.",
  },
  expired: {
    icon: Clock,
    title: "This link has expired",
    body:
      "For security, portal links expire after a set window. Let your freelancer know and they can generate a new one in a few seconds.",
  },
  revoked: {
    icon: Ban,
    title: "This link was revoked",
    body:
      "Your freelancer revoked this share link. They can issue a new one if you still need access.",
  },
  unknown: {
    icon: Mail,
    title: "We can't open the portal right now",
    body: "Please try the link again, or ask your freelancer to resend it.",
  },
}

function resolveReason(raw: string | undefined): Reason {
  if (raw === "no-session" || raw === "invalid-link" || raw === "expired" || raw === "revoked") {
    return raw
  }
  return "unknown"
}

export default async function PortalUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const copy = COPY[resolveReason(reason)]
  const Icon = copy.icon

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-zinc-900 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <H1 className="text-xl">Client Portal</H1>
            <Muted className="mt-1">Secure project workspace.</Muted>
          </div>
        </div>

        <Surface className="p-8 text-center space-y-5">
          <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center mx-auto">
            <Icon className="h-6 w-6 text-zinc-700" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <P className="font-semibold text-zinc-900">{copy.title}</P>
            <Muted className="text-sm leading-relaxed block">{copy.body}</Muted>
          </div>
          <div className="pt-2 border-t border-zinc-100">
            <Muted className="text-[10px] uppercase tracking-widest leading-loose">
              No signup required · No password to remember
            </Muted>
          </div>
        </Surface>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Back to velluma.app
          </Link>
        </div>
      </div>
    </div>
  )
}
