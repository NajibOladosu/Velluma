"use client";

import * as React from "react";
import { H1, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  FileText,
  MessageSquare,
  Clock,
  DollarSign,
  Download,
  Upload,
  Send,
  CheckCircle2,
  Circle,
  AlertCircle,
  PenLine,
  CreditCard,
  Loader2,
  X,
} from "lucide-react";
import {
  usePortalContracts,
  usePortalMilestones,
  usePortalPayments,
  usePortalEscrow,
  usePortalDocuments,
  type PortalContract,
} from "@/lib/queries/portal";
import { MessageThread } from "@/components/messages/message-thread";

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "tasks", label: "Tasks", icon: CheckCircle2 },
  { key: "billing", label: "Billing", icon: DollarSign },
  { key: "messages", label: "Messages", icon: MessageSquare },
] as const;

type TabKey = (typeof tabs)[number]["key"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ---------------------------------------------------------------------------
// OverviewTab
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  contractId: string;
  contract: PortalContract;
}

function OverviewTab({ contractId, contract }: OverviewTabProps) {
  const milestonesQuery = usePortalMilestones(contractId);
  const escrowQuery = usePortalEscrow(contractId);
  const documentsQuery = usePortalDocuments(contractId);
  const paymentsQuery = usePortalPayments(contractId);

  const milestones = milestonesQuery.data ?? [];
  const escrows = escrowQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const isLoading =
    milestonesQuery.isLoading ||
    escrowQuery.isLoading ||
    documentsQuery.isLoading ||
    paymentsQuery.isLoading;

  // Progress
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const progress =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Next milestone
  const nextMilestone = milestones.find(
    (m) => m.status === "pending" || m.status === "in_progress",
  );

  // Escrow held (active escrows)
  const escrowHeld = escrows
    .filter((e) => e.status === "active")
    .reduce((sum, e) => sum + e.fundedAmount, 0);

  // Activity timeline: merge milestone completions + payment events + contract sign
  type TimelineEvent = { text: string; ts: string };
  const events: TimelineEvent[] = [];

  milestones.forEach((m) => {
    if (m.completedAt) {
      events.push({ text: `Milestone "${m.title}" completed`, ts: m.completedAt });
    }
  });

  payments.forEach((p) => {
    if (p.completedAt) {
      const desc =
        p.label ??
        (p.paymentType === "release"
          ? "Payment released from escrow"
          : p.paymentType === "refund"
            ? "Payment refunded"
            : "Escrow funded");
      events.push({
        text: `${desc}: ${formatCurrency(p.amount, p.currency)}`,
        ts: p.completedAt,
      });
    }
  });

  if (contract.signedByClient && contract.signedByFreelancer) {
    events.push({ text: "Contract signed by both parties", ts: contract.updatedAt });
  }

  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div className="space-y-8">
      {/* Progress Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Project Progress</Muted>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 mt-2" />
              <Skeleton className="h-[2px] w-full mt-3" />
            </>
          ) : (
            <>
              <div className="text-3xl font-bold tracking-tighter text-zinc-900 mt-2">
                {progress}%
              </div>
              <div className="h-[2px] w-full bg-zinc-100 mt-3">
                <div
                  className="h-full bg-zinc-900 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <Muted className="text-[10px] mt-1">
                {completedMilestones} of {totalMilestones} milestones complete
              </Muted>
            </>
          )}
        </Surface>

        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Next Milestone</Muted>
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-36 mt-2" />
              <Skeleton className="h-3 w-24 mt-1" />
            </>
          ) : nextMilestone ? (
            <>
              <div className="text-sm font-bold text-zinc-900 mt-2">{nextMilestone.title}</div>
              {nextMilestone.dueDate && (
                <Muted className="text-[10px] mt-1">Due {formatDate(nextMilestone.dueDate)}</Muted>
              )}
            </>
          ) : (
            <>
              <div className="text-sm font-bold text-zinc-900 mt-2">All milestones complete</div>
              <Muted className="text-[10px] mt-1">Great work!</Muted>
            </>
          )}
        </Surface>

        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Escrow Held</Muted>
          {isLoading ? (
            <Skeleton className="h-8 w-24 mt-2" />
          ) : (
            <>
              <div className="text-3xl font-bold tracking-tighter text-zinc-900 mt-2">
                {formatCurrency(escrowHeld, contract.currency)}
              </div>
              <Muted className="text-[10px] mt-1">Stripe Connect Verified</Muted>
            </>
          )}
        </Surface>
      </div>

      {/* Timeline + Documents */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-7 space-y-4">
          <H3 className="text-base font-semibold">Activity Timeline</H3>
          <Surface className="p-5">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-5">
                {events.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <P className="text-sm leading-snug text-zinc-900 font-medium">{item.text}</P>
                      <Muted className="text-[10px] uppercase tracking-widest">
                        {relativeTime(item.ts)}
                      </Muted>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Muted className="text-sm">No activity yet.</Muted>
            )}
          </Surface>
        </div>

        <div className="md:col-span-5 space-y-4">
          <H3 className="text-base font-semibold">Shared Documents</H3>
          {isLoading ? (
            <Surface className="divide-y divide-zinc-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <Skeleton className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </div>
                </div>
              ))}
            </Surface>
          ) : documents.length > 0 ? (
            <Surface className="divide-y divide-zinc-100">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 flex items-center justify-between group cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      className="h-4 w-4 text-zinc-400 flex-shrink-0"
                      strokeWidth={1.5}
                    />
                    <div>
                      <P className="text-sm font-medium">
                        {doc.format.toUpperCase()} v{doc.version}
                      </P>
                      <Muted className="text-[10px]">{formatDate(doc.generatedAt)}</Muted>
                    </div>
                  </div>
                  {doc.storageUrl ? (
                    <a href={doc.storageUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                    </a>
                  ) : (
                    <Download className="h-4 w-4 text-zinc-200" />
                  )}
                </div>
              ))}
            </Surface>
          ) : (
            <Surface className="p-5">
              <Muted className="text-sm">No documents available yet.</Muted>
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TasksTab
// ---------------------------------------------------------------------------

function TasksTab({ contractId }: { contractId: string }) {
  const { data: milestones, isLoading, isError } = usePortalMilestones(contractId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Surface className="divide-y divide-zinc-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          ))}
        </Surface>
      </div>
    );
  }

  if (isError) {
    return <Muted className="text-sm">Failed to load milestones.</Muted>;
  }

  const rows = milestones ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H3 className="text-base font-semibold">Milestones</H3>
        <Muted className="text-xs">Showing client-visible milestones only.</Muted>
      </div>
      <Surface className="divide-y divide-zinc-100">
        {rows.length === 0 ? (
          <div className="p-5">
            <Muted className="text-sm">No milestones for this contract yet.</Muted>
          </div>
        ) : (
          rows.map((m) => (
            <div key={m.id} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {m.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-zinc-900" strokeWidth={2} />
                ) : m.status === "in_progress" ? (
                  <Clock className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                ) : m.status === "disputed" ? (
                  <AlertCircle className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
                )}
                <div>
                  <P
                    className={cn(
                      "text-sm font-medium",
                      m.status === "completed" ? "text-zinc-400 line-through" : "text-zinc-900",
                    )}
                  >
                    {m.title}
                  </P>
                  {m.dueDate && (
                    <Muted className="text-[10px] uppercase tracking-widest">
                      Due {formatDate(m.dueDate)}
                    </Muted>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-zinc-200 text-zinc-600 bg-transparent font-medium text-[10px] uppercase tracking-widest"
              >
                {m.status === "in_progress"
                  ? "In Progress"
                  : m.status === "completed"
                    ? "Done"
                    : m.status === "disputed"
                      ? "Disputed"
                      : "Upcoming"}
              </Badge>
            </div>
          ))
        )}
      </Surface>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BillingTab
// ---------------------------------------------------------------------------

interface BillingTabProps {
  contractId: string;
  contract: PortalContract;
}

function BillingTab({ contractId, contract }: BillingTabProps) {
  const { data: payments, isLoading, isError } = usePortalPayments(contractId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-40 rounded" />
        </div>
        <Surface className="overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                {["Description", "Date", "Amount", "Status"].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Skeleton className="h-5 w-16 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </div>
    );
  }

  if (isError) {
    return <Muted className="text-sm">Failed to load payment history.</Muted>;
  }

  const rows = payments ?? [];

  function statusLabel(status: string, type: string) {
    if (status === "completed") return type === "release" ? "Released" : "Completed";
    if (status === "pending") return "Pending";
    if (status === "failed") return "Failed";
    if (status === "refunded") return "Refunded";
    return status;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H3 className="text-base font-semibold">Payment Schedule</H3>
        <Button variant="outline" size="sm" className="border-zinc-200 text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download All Receipts
        </Button>
      </div>
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Description
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Date
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Amount
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const label =
                    p.label ??
                    (p.paymentType === "release"
                      ? "Payment Release"
                      : p.paymentType === "escrow"
                        ? "Escrow Deposit"
                        : "Refund");
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-zinc-900">{label}</td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-900">
                        {formatCurrency(p.amount, p.currency ?? contract.currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-zinc-200 bg-transparent font-medium",
                            p.status === "completed"
                              ? "text-zinc-500"
                              : p.status === "pending"
                                ? "text-zinc-400"
                                : p.status === "failed"
                                  ? "text-red-500"
                                  : "text-zinc-600",
                          )}
                        >
                          {statusLabel(p.status, p.paymentType)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessagesTab — wired to contract_messages
// ---------------------------------------------------------------------------

function MessagesTab({ contractId }: { contractId: string }) {
  return (
    <MessageThread
      apiPath={`/api/portal/contracts/${contractId}/messages`}
      selfRole="client"
      counterpartyName="your freelancer"
    />
  );
}

// ---------------------------------------------------------------------------
// Main Portal Page
// ---------------------------------------------------------------------------

export default function ClientPortalPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");
  const [selectedContractId, setSelectedContractId] = React.useState<string | null>(null);

  // Sign modal state
  const [signModalOpen, setSignModalOpen] = React.useState(false);
  const [signedName, setSignedName] = React.useState("");
  const [signState, setSignState] = React.useState<"idle" | "submitting" | "done" | "error">("idle");
  const [signError, setSignError] = React.useState<string | null>(null);

  // Pay state
  const [payState, setPayState] = React.useState<"idle" | "loading">("idle");

  const { data: contracts, isLoading: contractsLoading, refetch: refetchContracts } = usePortalContracts();

  const activeContract = React.useMemo(() => {
    if (!contracts?.length) return null;
    return contracts.find((c) => c.status === "active") ?? contracts[0];
  }, [contracts]);

  const contract =
    (selectedContractId ? contracts?.find((c) => c.id === selectedContractId) : null) ??
    activeContract ??
    null;

  const contractId = contract?.id ?? "";

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!contractId || !signedName.trim()) return;
    setSignState("submitting");
    setSignError(null);
    try {
      const res = await fetch(`/api/portal/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedName: signedName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSignState("error"); setSignError(data.error ?? "Failed to sign"); return; }
      setSignState("done");
      setSignModalOpen(false);
      setSignedName("");
      await refetchContracts();
    } catch {
      setSignState("error");
      setSignError("Network error. Please try again.");
    }
  }

  async function handlePay() {
    if (!contractId) return;
    setPayState("loading");
    try {
      const res = await fetch(`/api/portal/contracts/${contractId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) { setPayState("idle"); return; }
      window.location.href = data.checkoutUrl;
    } catch {
      setPayState("idle");
    }
  }

  const needsSignature = contract && !contract.signedByClient;
  const needsPayment   = contract && contract.signedByClient && !contract.totalAmount || false;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">

      {/* Sign modal */}
      {signModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => signState !== "submitting" && setSignModalOpen(false)} />
          <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <H3 className="text-base">Sign contract</H3>
                <Muted className="text-xs">Type your full legal name to sign.</Muted>
              </div>
              <button type="button" onClick={() => setSignModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleSign} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">Full legal name</label>
                <input
                  autoFocus
                  type="text"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  required
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>
              {signError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {signError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-100">
                <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setSignModalOpen(false)} disabled={signState === "submitting"}>Cancel</Button>
                <Button type="submit" size="sm" className="h-9" disabled={signState === "submitting" || !signedName.trim()}>
                  {signState === "submitting" && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Sign contract
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-md bg-zinc-900 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <div>
            {contractsLoading ? (
              <>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </>
            ) : contract ? (
              <>
                <H1 className="text-2xl">{contract.title}</H1>
                <Muted>{contract.clientEmail ?? "Client"} · Secured environment</Muted>
              </>
            ) : (
              <>
                <H1 className="text-2xl">Client Portal</H1>
                <Muted>No active contracts · Secured environment</Muted>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {contracts && contracts.length > 1 && (
            <select
              value={contractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              className="text-xs border border-zinc-200 rounded-md px-2.5 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          {contractsLoading ? (
            <Skeleton className="h-6 w-16 rounded" />
          ) : contract ? (
            <Badge
              variant="outline"
              className="border-zinc-200 text-zinc-900 bg-transparent font-bold capitalize"
            >
              {contract.status.replace(/_/g, " ")}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* ── Action banner — sign / pay ─────────────────── */}
      {!contractsLoading && contract && (
        <>
          {needsSignature && (
            <div className="flex items-start sm:items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                  <PenLine className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <P className="text-sm font-medium">Your signature is required</P>
                  <Muted className="text-xs">Review the contract then sign to proceed.</Muted>
                </div>
              </div>
              <Button size="sm" className="h-9 shrink-0 w-full sm:w-auto" onClick={() => { setSignState("idle"); setSignError(null); setSignModalOpen(true); }}>
                <PenLine className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Sign contract
              </Button>
            </div>
          )}

          {!needsSignature && contract.signedByClient && !contract.totalAmount && (
            <div className="flex items-start sm:items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                  <CreditCard className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <P className="text-sm font-medium">Secure your project with escrow</P>
                  <Muted className="text-xs">Funds are held safely until you approve delivery.</Muted>
                </div>
              </div>
              <Button size="sm" className="h-9 shrink-0 w-full sm:w-auto" onClick={handlePay} disabled={payState === "loading"}>
                {payState === "loading" ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />}
                Pay deposit
              </Button>
            </div>
          )}

          {!needsSignature && contract.signedByClient && contract.totalAmount ? (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              Contract signed · Escrow funded — you&apos;re all set.
            </div>
          ) : null}
        </>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-[1px]",
              activeTab === tab.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {contractsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : contract && contractId ? (
        <>
          {activeTab === "overview" && (
            <OverviewTab contractId={contractId} contract={contract} />
          )}
          {activeTab === "tasks" && <TasksTab contractId={contractId} />}
          {activeTab === "billing" && (
            <BillingTab contractId={contractId} contract={contract} />
          )}
          {activeTab === "messages" && <MessagesTab contractId={contractId} />}
        </>
      ) : (
        <div className="py-16 text-center">
          <Muted className="text-sm">No contracts found for your account.</Muted>
        </div>
      )}

      {/* Trust Footer */}
      <div className="text-center pt-6">
        <Muted className="text-[10px] uppercase tracking-widest leading-loose">
          All transactions are secured by 256-bit encryption. <br />
          Velluma Dispute Resolution is active for this project.
        </Muted>
      </div>
    </div>
  );
}
