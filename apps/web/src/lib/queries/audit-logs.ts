import { useQuery } from "@tanstack/react-query"

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  severity: "info" | "warning" | "critical" | null
  success: boolean | null
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (filters?: Record<string, string | undefined>) =>
    [...auditLogKeys.all, "list", filters] as const,
}

export function useAuditLogs(filters?: {
  resource_type?: string
  action?: string
  limit?: number
}) {
  return useQuery({
    queryKey: auditLogKeys.list(filters as Record<string, string | undefined>),
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (filters?.resource_type) qs.set("resource_type", filters.resource_type)
      if (filters?.action) qs.set("action", filters.action)
      if (filters?.limit) qs.set("limit", String(filters.limit))
      const res = await fetch(`/api/audit-logs?${qs.toString()}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load audit logs")
      const json = await res.json()
      return (json.logs ?? []) as AuditLog[]
    },
    staleTime: 30_000,
  })
}

