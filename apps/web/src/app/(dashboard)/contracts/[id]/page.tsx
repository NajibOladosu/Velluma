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
import {
  resolveContractMeta,
  resolveContractDescription,
} from "@/lib/data/contracts";
import { useContract } from "@/lib/queries/contracts";
import type { ContractSection } from "@/lib/queries/contracts";
import {
  ArrowLeft,
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
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type EditorTab = "editor" | "settings";

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
            "absolute -left-[14px] top-6 rounded-full p-1 cursor-pointer shadow-sm hover:scale-110 transition-transform border",
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
        <div className="absolute -left-[14px] top-6 bg-white border border-zinc-200 rounded-full p-1 shadow-sm">
          <Lock className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      )}

      {/* Clause header */}
      <H3 className="mb-4 flex justify-between items-center">
        {clause.title}
        {clause.alwaysEditable && (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:bg-blue-50">
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
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
        {/* LEFT: back link + title + badge + meta */}
        <div className="flex flex-col min-w-0 flex-1 w-full">
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contracts
          </Link>

          <div className="flex items-center gap-2 min-w-0 mb-1">
            <H1 className="text-2xl font-medium truncate min-w-0">
              {contractTitle}
            </H1>
            {aiEnhanced && (
              <Badge
                variant="outline"
                className="flex-shrink-0 bg-transparent text-violet-600 border-violet-200 gap-1"
              >
                <Sparkles className="h-3 w-3" />
                AI Generated
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
            {!isTemplate && contractStatus && (
              <Badge
                variant="outline"
                className={cn("flex-shrink-0 bg-transparent", statusConfig[contractStatus]?.className)}
              >
                {statusConfig[contractStatus]?.label}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground truncate min-w-0">
            {!isTemplate && contractClient && (
              <>
                {contractClientId ? (
                  <Link
                    href={`/clients/${contractClientId}`}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors truncate min-w-0 flex-shrink-0"
                  >
                    <Building className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{contractClient}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 truncate min-w-0 flex-shrink-0">
                    <Building className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{contractClient}</span>
                  </span>
                )}
                <span className="flex-shrink-0 text-zinc-300">•</span>
              </>
            )}
            {isTemplate && staticMeta?.usageCount !== undefined && (
              <>
                <span className="flex items-center gap-1 truncate min-w-0 flex-shrink-0">
                  <ReceiptText className="h-3 w-3 shrink-0" />
                  {staticMeta.usageCount} uses
                </span>
                <span className="flex-shrink-0 text-zinc-300">•</span>
                <span className="flex items-center gap-1 truncate min-w-0 flex-shrink-0">
                  <Lock className="h-3 w-3 shrink-0" />
                  {staticMeta.lockedClauses ?? 0} locked clause{(staticMeta.lockedClauses ?? 0) !== 1 ? "s" : ""}
                </span>
                <span className="flex-shrink-0 text-zinc-300">•</span>
              </>
            )}
            <span className="truncate min-w-0 flex-shrink-0">
              {isTemplate ? "Last modified" : "Created"} {contractDate}
            </span>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none h-9">
            <Eye className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          {isTemplate && (
            <Button variant="outline" className="flex-1 sm:flex-none h-9">
              <Copy className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Duplicate</span>
            </Button>
          )}
          <Button className="flex-1 sm:flex-none h-9">
            <Save className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Save</span>
            <span className="inline sm:hidden">Template</span>
          </Button>
        </div>
      </div>

      {/* ── Two-column builder layout ── */}
      <div className="flex gap-6 min-h-[calc(100vh-14rem)]">

        {/* Left Sidebar */}
        <aside className="w-64 border-r border-zinc-200 bg-zinc-50 p-4 shrink-0 overflow-y-auto hidden md:block">
          <div className="mb-6 px-2 text-sm font-medium text-zinc-900 flex justify-between items-center">
            Configuration
          </div>

          <div className="space-y-1 mb-6">
            <button
              onClick={() => setActiveTab("editor")}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all text-sm font-medium",
                activeTab === "editor"
                  ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100/80 border border-transparent"
              )}
            >
              <LayoutTemplate className="h-4 w-4" />
              Template Editor
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all text-sm font-medium",
                activeTab === "settings"
                  ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100/80 border border-transparent"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Legal Settings
            </button>
          </div>

          <Separator className="mb-6" />

          {/* Smart Fields Reference */}
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 block">
              Smart Fields
            </h3>
            <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
              Click to copy and paste into your agreement to auto-populate data when generating a proposal.
            </p>
            <div className="space-y-2">
              {["{{client.name}}", "{{client.company}}", "{{project.name}}", "{{project.deliverables}}", "{{payment.total}}"].map((field) => (
                <Badge
                  key={field}
                  variant="outline"
                  className="w-full justify-start bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer"
                  onClick={() => navigator.clipboard?.writeText(field)}
                >
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/30">
          <div className="mx-auto max-w-4xl p-4 py-8 sm:p-8 sm:py-12">

            {activeTab === "editor" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Builder Header */}
                <div className="mb-8 border-b border-zinc-200 pb-6">
                  <H2>Agreement {aiEnhanced ? "Sections" : "Template"}</H2>
                  <Muted className="mt-1 text-sm">
                    {contractDescription
                      ? contractDescription
                      : "Design the legal structure of your contract. Locked clauses cannot be edited when adding this to a proposal."}
                  </Muted>
                </div>

                {/* Clause Locking Banner */}
                <div className="mb-8 flex flex-wrap sm:flex-nowrap items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
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

                    <button className="rounded-xl border-dashed border-2 border-zinc-200 flex flex-col items-center justify-center p-6 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all min-h-[140px]">
                      <Users className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Require Counter-Signer</span>
                      <span className="text-[10px] text-zinc-400 mt-1">E.g., You or a team member</span>
                    </button>
                  </div>
                </div>

              </div>
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
