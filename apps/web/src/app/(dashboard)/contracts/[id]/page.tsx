"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { H1, H2, H3, Muted } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MinimalEditor } from "@/components/editor/editor";
import { DetailPageHeader, MetaSeparator } from "@/components/ui/detail-page-header";
import { SharePortalLink } from "@/components/portal/share-portal-link";
import {
  resolveContractMeta,
  resolveContractDescription,
} from "@/lib/data/contracts";
import { useContract } from "@/lib/queries/contracts";
import type { ContractSection } from "@/lib/queries/contracts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import {
  Eye,
  LayoutTemplate,
  ShieldCheck,
  CheckCircle2,
  Users,
  Sparkles,
  Lock,
  Unlock,
  Building,
  ExternalLink,
  Copy,
  Save,
  ReceiptText,
  Milestone,
  DollarSign,
  Loader2,
  AlertCircle,
  Clock,
  Circle,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type EditorTab = "editor" | "settings" | "milestones";

interface Clause {
  id: string;
  title: string;
  /** Clauses marked `alwaysLocked` cannot be toggled — they are system-generated. */
  alwaysLocked?: boolean;
  /** Clauses marked `alwaysEditable` skip the lock UI entirely. */
  alwaysEditable?: boolean;
  defaultContent: string;
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

/** Convert plain text (with \n\n paragraph breaks) to HTML for the TipTap editor. */
function textToHtml(text: string): string {
  if (!text) return ""
  // If it already looks like HTML, return as-is
  if (text.trim().startsWith("<")) return text
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/** Returns true when id is a Supabase UUID. */
function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/* ═══════════════════════════════════════════════════════
   DEFAULT CLAUSES — used for templates / static contracts
   ═══════════════════════════════════════════════════════ */

const DEFAULT_CLAUSES: Clause[] = [
  {
    id: "scope",
    title: "1. Scope of Work (Dynamic)",
    alwaysLocked: true,
    defaultContent: "",
  },
  {
    id: "custom",
    title: "2. Custom Terms (Editable Default)",
    alwaysEditable: true,
    defaultContent: "<p>Add custom clauses specific to this template...</p>",
  },
  {
    id: "payment",
    title: "3. Payment Terms",
    defaultContent: `<p>Client agrees to pay the total amount of <strong>{{payment.total}}</strong> according to the schedule specified in the Proposal. Standard late fees of 1.5% per month will apply to overdue invoices.</p>`,
  },
  {
    id: "ip",
    title: "4. Intellectual Property",
    defaultContent: `<p>Upon receipt of full payment, Provider assigns all rights, title, and interest in the work product to Client. Provider retains the right to display the work in their portfolio.</p>`,
  },
  {
    id: "termination",
    title: "5. Termination",
    defaultContent: `<p>Either party may terminate this Agreement with 14 days written notice. Client is responsible for payment of all work completed up to the termination date.</p>`,
  },
];

/** Map AI-generated sections to the Clause shape. */
function sectionsToClauses(sections: ContractSection[]): Clause[] {
  return sections.map((s) => ({
    id: s.id,
    title: s.title,
    defaultContent: textToHtml(s.content),
  }))
}

/* ═══════════════════════════════════════════════════════
   CLAUSE BLOCK COMPONENT
   ═══════════════════════════════════════════════════════ */

interface ClauseBlockProps {
  clause: Clause;
  isLocked: boolean;
  content: string;
  onToggleLock: (id: string) => void;
  onContentChange: (id: string, value: string) => void;
}

function ClauseBlock({
  clause,
  isLocked,
  content,
  onToggleLock,
  onContentChange,
}: ClauseBlockProps) {
  const locked = clause.alwaysLocked || isLocked;
  const showLockToggle = !clause.alwaysLocked && !clause.alwaysEditable;

  return (
    <Surface
      className={cn(
        "p-4 sm:p-8 relative transition-colors",
        locked && !clause.alwaysEditable
          ? "border-l-4 border-l-zinc-300"
          : "border-l-4 border-l-zinc-900"
      )}
    >
      {/* Lock toggle button */}
      {showLockToggle && (
        <button
          type="button"
          aria-label={isLocked ? "Unlock clause" : "Lock clause"}
          onClick={() => onToggleLock(clause.id)}
          className={cn(
            "absolute -left-[14px] top-6 rounded-md p-1 cursor-pointer hover:scale-105 transition-transform border shadow-lg",
            isLocked
              ? "bg-white border-zinc-200"
              : "bg-zinc-900 border-zinc-900"
          )}
        >
          {isLocked ? (
            <Lock className="h-3.5 w-3.5 text-zinc-600" />
          ) : (
            <Unlock className="h-3.5 w-3.5 text-white" />
          )}
        </button>
      )}

      {/* Always-locked system clauses — static pin indicator */}
      {clause.alwaysLocked && (
        <div className="absolute -left-[14px] top-6 bg-white border border-zinc-200 rounded-md p-1 shadow-lg">
          <Lock className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      )}

      {/* Clause header */}
      <H3 className="mb-4 flex justify-between items-center">
        {clause.title}
        {clause.alwaysEditable && (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-zinc-700 hover:bg-zinc-50">
            <Sparkles className="h-3 w-3 mr-1" /> Enhance
          </Button>
        )}
      </H3>

      {/* Clause body */}
      {clause.alwaysLocked ? (
        <div className="text-sm text-zinc-600 space-y-3 opacity-80 bg-zinc-50 p-4 rounded-md border border-zinc-100">
          <p>
            Provider agrees to perform the services detailed in the &ldquo;Scope &amp; Value&rdquo;
            section of the associated Proposal. Any expansion of the scope will require a separate
            written agreement or change order.
          </p>
          <p className="text-xs text-zinc-400 mt-2 font-medium italic">
            This text is generated from the Proposal&apos;s deliverable section and cannot be edited
            directly.
          </p>
        </div>
      ) : locked ? (
        <div
          className="text-sm text-zinc-600 opacity-80 cursor-not-allowed select-none prose prose-sm prose-zinc max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <MinimalEditor
          content={content}
          onChange={(val) => onContentChange(clause.id, val)}
          placeholder="Edit clause..."
          className="min-h-[120px]"
        />
      )}
    </Surface>
  );
}

/* ═══════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════ */

function ContractDetailSkeleton() {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-6 min-h-[calc(100vh-14rem)]">
        <aside className="w-64 border-r border-zinc-200 bg-zinc-50 p-4 shrink-0 hidden md:block">
          <Skeleton className="h-4 w-32 mb-6" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </aside>
        <main className="flex-1 space-y-4 p-8">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-8" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </main>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   FREELANCER SIGN BUTTON + MODAL
   ═══════════════════════════════════════════════════════ */

function FreelancerSignButton({ contractId }: { contractId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const signMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedName: name.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); qc.invalidateQueries({ queryKey: ["contract", contractId] }); setOpen(false); setName(""); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <>
      <Button size="sm" variant="default" className="flex-1 sm:flex-none h-9" onClick={() => { setError(null); setOpen(true); }}>
        <CheckCircle2 className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
        <span className="hidden sm:inline">Sign</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => !signMutation.isPending && setOpen(false)} />
          <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-6 space-y-5">
            <div>
              <H3 className="text-base">Sign contract</H3>
              <Muted className="text-xs">Type your full legal name. This counts as your binding signature.</Muted>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) signMutation.mutate(); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">Full legal name</label>
                <input
                  autoFocus required type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Najib Oladosu"
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
                <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setOpen(false)} disabled={signMutation.isPending}>Cancel</Button>
                <Button type="submit" size="sm" className="h-9" disabled={signMutation.isPending || !name.trim()}>
                  {signMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Sign contract
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   MILESTONES PANEL
   ═══════════════════════════════════════════════════════ */

function MilestonesPanel({ contractId }: { contractId: string }) {
  const qc = useQueryClient();
  const supabase = React.useMemo(() => createSupabaseClient(), []);

  const { data: milestones, isLoading: mLoading } = useQuery({
    queryKey: ["milestones", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("id, title, description, amount, due_date, status, completed_at")
        .eq("contract_id", contractId)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: escrows, isLoading: eLoading } = useQuery({
    queryKey: ["contract_escrows", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_escrows")
        .select("id, funded_amount, currency, status, funded_at")
        .eq("contract_id", contractId)
        .order("funded_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await fetch(`/api/contracts/${contractId}/milestones/${milestoneId}/complete`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", contractId] }),
  });

  const releaseMutation = useMutation({
    mutationFn: async (escrowId: string) => {
      const res = await fetch(`/api/contracts/${contractId}/escrow/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract_escrows", contractId] }),
  });

  const activeEscrow = escrows?.find((e) => e.status === "active");
  const allMilestoneDone = milestones?.length > 0 && milestones.every((m) => m.status === "completed");

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />;
    if (status === "in_progress") return <Clock className="h-4 w-4 text-zinc-500 shrink-0" strokeWidth={1.5} />;
    return <Circle className="h-4 w-4 text-zinc-300 shrink-0" strokeWidth={1.5} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="pb-6 border-b border-zinc-200">
        <H2>Milestones & Escrow</H2>
        <Muted className="mt-1 text-sm">Track deliverables and release payments as work completes.</Muted>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Milestones</h3>
          {milestones?.length ? (
            <Muted className="text-xs">{milestones.filter(m => m.status === "completed").length} / {milestones.length} complete</Muted>
          ) : null}
        </div>

        {mLoading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)
        ) : !milestones?.length ? (
          <Surface className="p-6 text-center">
            <Muted className="text-sm">No milestones yet. Add them to track project phases.</Muted>
          </Surface>
        ) : (
          milestones.map((m) => (
            <Surface key={m.id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                {statusIcon(m.status)}
                <div className="min-w-0">
                  <div className={cn("text-sm font-medium", m.status === "completed" ? "text-zinc-400 line-through" : "text-zinc-900")}>
                    {m.title}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {m.due_date && (
                      <Muted className="text-xs">Due {new Date(m.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Muted>
                    )}
                    {m.amount > 0 && (
                      <span className="text-xs font-medium text-zinc-700 flex items-center gap-0.5">
                        <DollarSign className="h-3 w-3" strokeWidth={1.5} />{Number(m.amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {m.status !== "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  disabled={completeMutation.isPending}
                  onClick={() => completeMutation.mutate(m.id)}
                >
                  {completeMutation.isPending && completeMutation.variables === m.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Mark complete"
                  )}
                </Button>
              )}
            </Surface>
          ))
        )}
      </div>

      {/* Escrow positions */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Escrow</h3>
        {eLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !escrows?.length ? (
          <Surface className="p-6 text-center">
            <Muted className="text-sm">No escrow positions. Funds appear here once the client pays the deposit.</Muted>
          </Surface>
        ) : (
          escrows.map((e) => (
            <Surface key={e.id} className="p-4 flex items-start sm:items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-zinc-600" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900">
                    {Number(e.funded_amount).toLocaleString()} {e.currency}
                  </div>
                  <Badge variant={e.status === "released" ? "emerald" : e.status === "active" ? "outline" : "default"} className="text-[10px] uppercase tracking-wide mt-0.5">
                    {e.status}
                  </Badge>
                </div>
              </div>
              {e.status === "active" && (
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={releaseMutation.isPending || !allMilestoneDone}
                  onClick={() => releaseMutation.mutate(e.id)}
                  title={!allMilestoneDone ? "Complete all milestones before releasing" : undefined}
                >
                  {releaseMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Release payment
                </Button>
              )}
            </Surface>
          ))
        )}

        {releaseMutation.isError && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            {releaseMutation.error?.message ?? "Release failed. Try again."}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function ContractBuilderPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";

  // For UUID IDs: fetch from Supabase. For static IDs (t1, 1, etc.): use mock data.
  const fetchFromDB = isUUID(id)
  const { data: dbContract, isLoading } = useContract(fetchFromDB ? id : "")

  // Resolve header metadata
  const staticMeta = !fetchFromDB ? resolveContractMeta(id) : null
  const staticDescription = !fetchFromDB ? resolveContractDescription(id) : null

  const contractTitle = dbContract?.title ?? staticMeta?.name ?? "Untitled Contract"
  const contractDescription = dbContract?.description || staticDescription || ""
  const isTemplate = staticMeta?.isTemplate ?? false
  const contractStatus = dbContract?.status ?? staticMeta?.status ?? undefined
  const contractClient = dbContract?.client ?? staticMeta?.client
  const contractClientId = dbContract?.clientId ?? staticMeta?.clientId
  const contractDate = dbContract?.createdAt ?? staticMeta?.date ?? "—"
  const aiEnhanced = dbContract?.aiEnhanced ?? false

  // Build clauses from AI sections or fall back to defaults
  const clauses: Clause[] =
    dbContract?.sections && dbContract.sections.length > 0
      ? sectionsToClauses(dbContract.sections)
      : DEFAULT_CLAUSES

  // Status badge config
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft:   { label: "Draft",             className: "text-zinc-500 border-zinc-200" },
    pending: { label: "Pending Signatures", className: "text-amber-700 border-amber-300 bg-amber-50/50" },
    signed:  { label: "Executed",           className: "text-zinc-900 border-zinc-900 font-bold" },
    expired: { label: "Expired",            className: "text-zinc-400 border-zinc-200" },
  };

  const [activeTab, setActiveTab] = React.useState<EditorTab>("editor");

  // Per-clause lock and content state — initialized/reset when contract changes
  const [lockedClauses, setLockedClauses] = React.useState<Set<string>>(
    () => new Set(DEFAULT_CLAUSES.filter((c) => !c.alwaysEditable).map((c) => c.id))
  );
  const [clauseContents, setClauseContents] = React.useState<Record<string, string>>(
    () => Object.fromEntries(DEFAULT_CLAUSES.map((c) => [c.id, c.defaultContent]))
  );

  // When real contract data loads, reinitialize clauses
  React.useEffect(() => {
    if (clauses.length === 0) return
    setClauseContents(Object.fromEntries(clauses.map((c) => [c.id, c.defaultContent ?? ""])))
    setLockedClauses(new Set(clauses.filter((c) => !c.alwaysEditable).map((c) => c.id)))
  }, [dbContract?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleClauseLock(id: string) {
    setLockedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContentChange(id: string, value: string) {
    setClauseContents((prev) => ({ ...prev, [id]: value }));
  }

  const togglableClauses = clauses.filter((c) => !c.alwaysLocked && !c.alwaysEditable);
  const allLocked = togglableClauses.every((c) => lockedClauses.has(c.id));

  function toggleAll() {
    if (allLocked) {
      setLockedClauses((prev) => {
        const next = new Set(prev);
        togglableClauses.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setLockedClauses((prev) => {
        const next = new Set(prev);
        togglableClauses.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }

  if (isLoading) return <ContractDetailSkeleton />

  return (
    <div className="space-y-6 pb-20">
      <DetailPageHeader
        backHref="/contracts"
        backLabel="Back to Contracts"
        title={
          <>
            <H1 className="text-2xl font-medium truncate min-w-0">
              {contractTitle}
            </H1>
            {!isTemplate && contractStatus && (
              <Badge
                variant="outline"
                className={cn("flex-shrink-0 bg-transparent", statusConfig[contractStatus]?.className)}
              >
                {statusConfig[contractStatus]?.label}
              </Badge>
            )}
            {isTemplate && (
              <Badge
                variant="outline"
                className={cn(
                  "flex-shrink-0 bg-transparent text-zinc-500 border-zinc-200",
                  staticMeta?.type === "standard" && "text-zinc-700"
                )}
              >
                {staticMeta?.type === "standard" ? "Standard" : "Custom"} Template
              </Badge>
            )}
            {aiEnhanced && (
              <Badge
                variant="outline"
                className="flex-shrink-0 bg-transparent text-zinc-700 border-zinc-200 gap-1"
              >
                <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                AI Generated
              </Badge>
            )}
          </>
        }
        meta={
          <>
            {!isTemplate && contractClient && (
              <>
                {contractClientId ? (
                  <Link
                    href={`/clients/${contractClientId}`}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors truncate min-w-0"
                  >
                    <Building className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{contractClient}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 truncate min-w-0">
                    <Building className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{contractClient}</span>
                  </span>
                )}
                <MetaSeparator />
              </>
            )}
            {isTemplate && staticMeta?.usageCount !== undefined && (
              <>
                <span className="inline-flex items-center gap-1">
                  <ReceiptText className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  {staticMeta.usageCount} uses
                </span>
                <MetaSeparator />
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  {staticMeta.lockedClauses ?? 0} locked clause{(staticMeta.lockedClauses ?? 0) !== 1 ? "s" : ""}
                </span>
                <MetaSeparator />
              </>
            )}
            <span>
              {isTemplate ? "Last modified" : "Created"} {contractDate}
            </span>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-9">
              <Eye className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            {isTemplate && (
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-9">
                <Copy className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Duplicate</span>
              </Button>
            )}
            {!isTemplate && fetchFromDB && dbContract && (
              <SharePortalLink
                engagementType="contract"
                engagementId={dbContract.id}
                engagementTitle={contractTitle}
                defaultClientEmail={
                  /\S+@\S+\.\S+/.test(dbContract.client) ? dbContract.client : undefined
                }
                className="flex-1 sm:flex-none"
              />
            )}
            {!isTemplate && fetchFromDB && dbContract && !dbContract.signedByFreelancer && (
              <FreelancerSignButton contractId={dbContract.id} />
            )}
            {!isTemplate && fetchFromDB && dbContract?.signedByFreelancer && (
              <Badge variant="emerald" className="text-[10px] uppercase tracking-wide flex items-center gap-1 h-9 px-3">
                <CheckCircle2 className="h-3 w-3" strokeWidth={2} /> Signed
              </Badge>
            )}
            <Button size="sm" className="flex-1 sm:flex-none h-9">
              <Save className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
              <span>Save</span>
            </Button>
          </>
        }
      />

      {/* ── Two-column builder layout ── */}
      <div className="flex gap-6 min-h-[calc(100vh-14rem)]">

        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 overflow-y-auto hidden md:block">
          <div className="sticky top-6 space-y-6">
          <div className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Configuration
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("editor")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm font-medium",
                activeTab === "editor"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100/60"
              )}
            >
              <LayoutTemplate className="h-4 w-4" strokeWidth={1.5} />
              Template Editor
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm font-medium",
                activeTab === "settings"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100/60"
              )}
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              Legal Settings
            </button>
            {!isTemplate && fetchFromDB && (
              <button
                onClick={() => setActiveTab("milestones")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm font-medium",
                  activeTab === "milestones"
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100/60"
                )}
              >
                <Milestone className="h-4 w-4" strokeWidth={1.5} />
                Milestones
              </button>
            )}
          </div>

          <Separator />

          {/* Smart Fields Reference */}
          <div className="space-y-3 px-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Smart Fields
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Click to copy — these auto-populate when generating a proposal.
            </p>
            <div className="space-y-1.5">
              {["{{client.name}}", "{{client.company}}", "{{project.name}}", "{{project.deliverables}}", "{{payment.total}}"].map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(field)}
                  className="w-full text-left px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  {field}
                </button>
              ))}
            </div>
          </div>
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl pb-8">

            {activeTab === "editor" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Builder Header */}
                <div className="pb-6 border-b border-zinc-200">
                  <H2>Agreement {aiEnhanced ? "Sections" : "Template"}</H2>
                  <Muted className="mt-1 text-sm">
                    {contractDescription
                      ? contractDescription
                      : "Design the legal structure of your contract. Locked clauses cannot be edited when adding this to a proposal."}
                  </Muted>
                </div>

                {/* Clause Locking Banner */}
                <div className="mb-8 flex flex-wrap sm:flex-nowrap items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-900">Clause Locking</h4>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      Use the lock icon next to each clause to control which sections can be edited.{" "}
                      <span className="font-medium text-zinc-700">
                        {togglableClauses.filter((c) => lockedClauses.has(c.id)).length} of {togglableClauses.length} togglable clauses locked.
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-zinc-200 font-medium shrink-0"
                    onClick={toggleAll}
                  >
                    {allLocked ? (
                      <><Unlock className="h-3 w-3 mr-1" /> Unlock All</>
                    ) : (
                      <><Lock className="h-3 w-3 mr-1" /> Lock All</>
                    )}
                  </Button>
                </div>

                {/* Clause Blocks */}
                {clauses.map((clause) => (
                  <ClauseBlock
                    key={clause.id}
                    clause={clause}
                    isLocked={lockedClauses.has(clause.id)}
                    content={clauseContents[clause.id] ?? ""}
                    onToggleLock={toggleClauseLock}
                    onContentChange={handleContentChange}
                  />
                ))}

                {/* Add Clause Button */}
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    className="border-dashed h-10 border-2 text-zinc-500 bg-transparent hover:bg-zinc-50 hover:text-zinc-800 hover:border-zinc-300"
                  >
                    + Add New Clause Block
                  </Button>
                </div>

                {/* Signature Settings */}
                <div className="mt-12 space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 px-2">
                    Signatures Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Surface className="p-6 border bg-white flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-zinc-50 text-zinc-600">Primary Client</Badge>
                        <Lock className="h-3 w-3 text-zinc-400 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 truncate">
                          {contractClient ?? "{{client.name}}"}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 truncate">
                          {dbContract?.client ?? "{{client.email}}"}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Auto-assigned from project
                        </p>
                      </div>
                    </Surface>

                    <button className="rounded-lg border-dashed border-2 border-zinc-200 flex flex-col items-center justify-center p-6 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors min-h-[140px]">
                      <Users className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Require Counter-Signer</span>
                      <span className="text-[10px] text-zinc-400 mt-1">E.g., You or a team member</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "milestones" && fetchFromDB && id && (
              <MilestonesPanel contractId={id} />
            )}

            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-8 border-b border-zinc-200 pb-6">
                  <H2>Legal Settings</H2>
                  <Muted className="mt-1 text-sm">Configure defaults and automations for this template.</Muted>
                </div>

                <Surface className="p-8">
                  <H3 className="text-base mb-6">Template Details</H3>
                  <div className="space-y-6 max-w-md">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Template Name
                      </label>
                      <input
                        type="text"
                        className="w-full flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                        defaultValue={contractTitle}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Internal Description
                      </label>
                      <textarea
                        className="w-full flex rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 min-h-[100px]"
                        defaultValue={contractDescription}
                      />
                    </div>
                  </div>
                </Surface>

                <Surface className="p-8">
                  <H3 className="text-base mb-6">Default Automations</H3>
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-start sm:items-center justify-between gap-3 border border-zinc-200 p-4 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900">Auto-Reminders</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Send automatic reminders if unsigned</p>
                      </div>
                      <Badge variant="outline" className="bg-white shrink-0 whitespace-nowrap">3 days before expiry</Badge>
                    </div>
                    <div className="flex items-start sm:items-center justify-between gap-3 border border-zinc-200 p-4 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900">Post-Signature Action</p>
                        <p className="text-xs text-zinc-500 mt-0.5">What happens after all parties sign</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-white shrink-0">
                        Configure Actions
                      </Button>
                    </div>
                  </div>
                </Surface>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
