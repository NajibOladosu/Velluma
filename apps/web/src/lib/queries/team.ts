import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface TeamMember {
  id: string
  email: string
  role: "owner" | "admin" | "member" | "viewer"
  status: "active" | "suspended" | "removed"
  user_id: string | null
  created_at: string
}

export interface TeamInvitation {
  id: string
  email: string
  role: "admin" | "member" | "viewer"
  token: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}

export const teamKeys = {
  all: ["team"] as const,
  roster: () => [...teamKeys.all, "roster"] as const,
}

export function useTeamRoster() {
  return useQuery({
    queryKey: teamKeys.roster(),
    queryFn: async () => {
      const res = await fetch("/api/team/members", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load team")
      return (await res.json()) as { members: TeamMember[]; invitations: TeamInvitation[] }
    },
    staleTime: 30_000,
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; role: "admin" | "member" | "viewer" }) => {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to invite")
      }
      return (await res.json()) as { accept_url: string; token: string; id: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.roster() }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/invitations?id=${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Failed to revoke")
      return true
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.roster() }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/members?id=${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Failed to remove")
      return true
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.roster() }),
  })
}
