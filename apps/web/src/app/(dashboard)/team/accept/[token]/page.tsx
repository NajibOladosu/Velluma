"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Surface } from "@/components/ui/surface"
import { H1, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    // Auto-accept once
    void accept()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function accept() {
    setStatus("loading")
    try {
      const res = await fetch(`/api/team/accept/${params.token}`, {
        method: "POST",
        credentials: "include",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus("error")
        setMessage(body.error ?? "Unable to accept invite")
        return
      }
      setStatus("ok")
      setTimeout(() => router.push("/dashboard"), 1200)
    } catch (err) {
      setStatus("error")
      setMessage((err as Error).message)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-20">
      <Surface className="p-8 text-center">
        <H1 className="mb-3">Team invitation</H1>
        {status === "loading" && <Muted>Accepting your invite…</Muted>}
        {status === "ok" && <Muted>Welcome to the team. Redirecting…</Muted>}
        {status === "error" && (
          <>
            <Muted>{message || "Unable to accept invite."}</Muted>
            <div className="mt-6">
              <Button onClick={accept}>Try again</Button>
            </div>
          </>
        )}
      </Surface>
    </div>
  )
}
