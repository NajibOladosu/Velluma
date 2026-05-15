"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}
import { Surface } from "@/components/ui/surface"
import { H1, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuditLogs, type AuditLog } from "@/lib/queries/audit-logs"
import { Shield, AlertTriangle, Info, XCircle, ChevronRight } from "lucide-react"

/**
 * Map an audit log row to its resource detail page. Returns null when the
 * resource type doesn't have a drill-down target (settings, team, etc.).
 */
function drillDownHref(resourceType: string, resourceId: string | null): string | null {
  if (!resourceId) return null
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)
  if (!isUuid) return null
  switch (resourceType) {
    case "contract": return `/contracts/${resourceId}`
    case "invoice": return `/invoices/${resourceId}`
    case "proposal": return `/proposals/${resourceId}`
    case "client": return `/clients/${resourceId}`
    case "project": return `/projects/${resourceId}`
    case "expense": return `/expenses`
    case "booking": return `/bookings`
    case "portal": return `/clients/${resourceId}`
    default: return null
  }
}

const RESOURCE_TYPES = [
  { value: "", label: "All resources" },
  { value: "contract", label: "Contracts" },
  { value: "invoice", label: "Invoices" },
  { value: "proposal", label: "Proposals" },
  { value: "client", label: "Clients" },
  { value: "portal", label: "Portal" },
  { value: "settings", label: "Settings" },
  { value: "team", label: "Team" },
  { value: "escrow", label: "Escrow" },
  { value: "payout", label: "Payouts" },
]

function severityIcon(sev: AuditLog["severity"], success: boolean | null) {
  if (success === false) return <XCircle className="h-4 w-4 text-red-600" strokeWidth={1.5} />
  if (sev === "critical") return <AlertTriangle className="h-4 w-4 text-red-600" strokeWidth={1.5} />
  if (sev === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
  return <Info className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-zinc-100">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24 ml-auto" />
    </div>
  )
}

export default function AuditLogPage() {
  const router = useRouter()
  const [resourceType, setResourceType] = useState<string>("")
  const { data: logs, isLoading } = useAuditLogs({
    resource_type: resourceType || undefined,
    limit: 200,
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div>
        <H1>Audit Log</H1>
        <Muted>Security-relevant activity for your workspace. Retained for 90 days.</Muted>
      </div>

      <Surface className="p-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Shield className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <div className="flex flex-wrap gap-2">
            {RESOURCE_TYPES.map((rt) => (
              <Button
                key={rt.value}
                size="sm"
                variant={resourceType === rt.value ? "default" : "outline"}
                onClick={() => setResourceType(rt.value)}
              >
                {rt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-200 -mx-6">
          {isLoading ? (
            <div className="px-6">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Muted>No audit events yet.</Muted>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {logs.map((log) => {
                const href = drillDownHref(log.resource_type, log.resource_id)
                const clickable = href !== null
                const onClick = clickable ? () => router.push(href) : undefined
                return (
                  <div
                    key={log.id}
                    role={clickable ? "link" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={onClick}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onClick?.()
                            }
                          }
                        : undefined
                    }
                    className={
                      "px-6 py-3 flex items-start gap-4 transition-colors group " +
                      (clickable
                        ? "cursor-pointer hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-zinc-900"
                        : "hover:bg-zinc-50")
                    }
                  >
                    <div className="mt-0.5">{severityIcon(log.severity, log.success)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-900">{log.action}</span>
                        <Badge variant="outline">{log.resource_type}</Badge>
                        {log.success === false && (
                          <Badge variant="outline" className="border-red-200 text-red-700">failed</Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 truncate">
                        {log.resource_id}
                        {log.ip_address ? ` · ${log.ip_address}` : ""}
                      </div>
                      {log.error_message && (
                        <div className="text-xs text-red-600 mt-1">{log.error_message}</div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 whitespace-nowrap flex items-center gap-1">
                      {fmtShort(new Date(log.created_at))}
                      {clickable && (
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-500 transition-colors" strokeWidth={1.5} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Surface>
    </div>
  )
}
