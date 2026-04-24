"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Surface } from "@/components/ui/surface"
import { H1, H3, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useTeamRoster, useInviteMember, useRevokeInvitation, useRemoveMember } from "@/lib/queries/team"
import { UserPlus, Copy, Check, Trash2, Clock } from "lucide-react"

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

export default function TeamPage() {
  const { data, isLoading } = useTeamRoster()
  const invite = useInviteMember()
  const revoke = useRevokeInvitation()
  const remove = useRemoveMember()

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member")
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleInvite = async () => {
    if (!email) return
    const result = await invite.mutateAsync({ email, role })
    setLastInviteUrl(result.accept_url)
    setEmail("")
  }

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div>
        <H1>Team</H1>
        <Muted>Invite collaborators into your workspace. Members share clients, projects and invoices.</Muted>
      </div>

      <Surface className="p-6">
        <H3 className="mb-4">Invite a member</H3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <Button onClick={handleInvite} disabled={invite.isPending || !email}>
            <UserPlus className="h-4 w-4 mr-2" strokeWidth={1.5} />
            {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </div>

        {invite.isError && (
          <div className="mt-3 text-sm text-red-600">
            {(invite.error as Error).message}
          </div>
        )}

        {lastInviteUrl && (
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 flex items-center gap-3">
            <div className="flex-1 text-xs font-mono truncate text-zinc-700">{lastInviteUrl}</div>
            <Button size="sm" variant="outline" onClick={() => copy(lastInviteUrl)}>
              {copied ? <Check className="h-4 w-4" strokeWidth={1.5} /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
              <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        )}
      </Surface>

      <Surface className="p-6">
        <H3 className="mb-4">Members</H3>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !data || data.members.length === 0 ? (
          <Muted>No team members yet.</Muted>
        ) : (
          <div className="divide-y divide-zinc-100 -mx-6">
            {data.members.map((m) => (
              <div key={m.id} className="px-6 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">{m.email}</div>
                  <div className="text-xs text-zinc-500">joined {format(new Date(m.created_at), "MMM d, yyyy")}</div>
                </div>
                <Badge variant="outline">{ROLE_LABEL[m.role] ?? m.role}</Badge>
                {m.status === "active" ? (
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700">active</Badge>
                ) : (
                  <Badge variant="outline">{m.status}</Badge>
                )}
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(m.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4 text-red-600" strokeWidth={1.5} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Surface className="p-6">
        <H3 className="mb-4">Pending invitations</H3>
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : !data || data.invitations.length === 0 ? (
          <Muted>No pending invitations.</Muted>
        ) : (
          <div className="divide-y divide-zinc-100 -mx-6">
            {data.invitations.map((inv) => (
              <div key={inv.id} className="px-6 py-3 flex items-center gap-4">
                <Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">{inv.email}</div>
                  <div className="text-xs text-zinc-500">
                    expires {format(new Date(inv.expires_at), "MMM d, yyyy")}
                  </div>
                </div>
                <Badge variant="outline">{ROLE_LABEL[inv.role] ?? inv.role}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard.writeText(`${window.location.origin}/team/accept/${inv.token}`)
                  }
                >
                  <Copy className="h-4 w-4 mr-1" strokeWidth={1.5} />
                  Copy link
                </Button>
                <Button size="icon" variant="ghost" onClick={() => revoke.mutate(inv.id)} aria-label="Revoke">
                  <Trash2 className="h-4 w-4 text-red-600" strokeWidth={1.5} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  )
}
