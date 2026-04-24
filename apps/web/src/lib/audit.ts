/**
 * Audit log helper. Writes to public.audit_logs via service role.
 *
 * Call from server-side mutations only. Failures are logged but never thrown —
 * audit writes must not break the primary flow.
 */
import { createServiceClient } from "@/utils/supabase/server"
import type { NextRequest } from "next/server"

export type AuditSeverity = "info" | "warning" | "critical"

export interface AuditParams {
  userId: string | null
  action: string
  resourceType: string
  resourceId: string
  details?: Record<string, unknown>
  metadata?: Record<string, unknown>
  severity?: AuditSeverity
  success?: boolean
  errorMessage?: string
  request?: NextRequest | Request | null
}

function extractIp(request?: NextRequest | Request | null): string | null {
  if (!request) return null
  const h = request.headers
  const xff = h.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return h.get("x-real-ip") || null
}

function extractUa(request?: NextRequest | Request | null): string | null {
  if (!request) return null
  return request.headers.get("user-agent") || null
}

export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      ip_address: extractIp(params.request),
      user_agent: extractUa(params.request),
      details: params.details ?? null,
      metadata: params.metadata ?? null,
      severity: params.severity ?? "info",
      success: params.success ?? true,
      error_message: params.errorMessage ?? null,
    })
  } catch (err) {
    console.error("[audit] write failed", err)
  }
}

export const AuditEvents = {
  ContractCreated: "contract.created",
  ContractSigned: "contract.signed",
  ContractSent: "contract.sent",
  ContractCancelled: "contract.cancelled",
  EscrowFunded: "escrow.funded",
  EscrowReleased: "escrow.released",
  EscrowRefunded: "escrow.refunded",
  InvoiceCreated: "invoice.created",
  InvoiceSent: "invoice.sent",
  InvoicePaid: "invoice.paid",
  ProposalCreated: "proposal.created",
  ProposalSent: "proposal.sent",
  ClientCreated: "client.created",
  ClientDeleted: "client.deleted",
  PortalTokenIssued: "portal.token_issued",
  PortalTokenRevoked: "portal.token_revoked",
  PortalSessionCreated: "portal.session_created",
  TeamInviteSent: "team.invite_sent",
  TeamInviteAccepted: "team.invite_accepted",
  TeamMemberRemoved: "team.member_removed",
  SettingsChanged: "settings.changed",
  PayoutRequested: "payout.requested",
} as const
