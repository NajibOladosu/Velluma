"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { H1, H2, H3, Muted } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MinimalEditor } from "@/components/editor/editor";
import {
  resolveContractMeta,
  resolveContractDescription,
} from "@/lib/data/contracts";
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
   CLAUSE DATA — single source of truth
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
        "p-8 relative transition-colors",
        locked && !clause.alwaysEditable
          ? "border-l-4 border-l-zinc-300"
          : "border-l-4 border-l-zinc-900"
      )}
    >
      {/* Lock toggle button — positioned on the left border */}
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
        /* System-generated — never editable */
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
        /* Locked — read-only preview */
        <div
          className="text-sm text-zinc-600 opacity-80 cursor-not-allowed select-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        /* Unlocked — editable */
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
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function ContractBuilderPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";

  // Resolve all metadata from the shared data layer
  const meta             = resolveContractMeta(id);
  const contractName     = meta.name;
  const contractDescription = resolveContractDescription(id);

  // Status badge config for active contracts
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft:   { label: "Draft",             className: "text-zinc-500 border-zinc-200" },
    pending: { label: "Pending Signatures", className: "text-amber-700 border-amber-300 bg-amber-50/50" },
    signed:  { label: "Executed",           className: "text-zinc-900 border-zinc-900 font-bold" },
    expired: { label: "Expired",            className: "text-zinc-400 border-zinc-200" },
  };

  const [activeTab, setActiveTab] = React.useState<EditorTab>("editor");

  // Per-clause lock state — Set of locked clause IDs.
  // Clauses start locked unless they are `alwaysEditable`.
  const [lockedClauses, setLockedClauses] = React.useState<Set<string>>(
    () =>
      new Set(
        DEFAULT_CLAUSES.filter((c) => !c.alwaysEditable).map((c) => c.id)
      )
  );

  // Per-clause content state
  const [clauseContents, setClauseContents] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(DEFAULT_CLAUSES.map((c) => [c.id, c.defaultContent]))
  );

  function toggleClauseLock(id: string) {
    setLockedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleContentChange(id: string, value: string) {
    setClauseContents((prev) => ({ ...prev, [id]: value }));
  }

  // "Lock All" / "Unlock All" operates only on togglable clauses
  const togglableClauses = DEFAULT_CLAUSES.filter(
    (c) => !c.alwaysLocked && !c.alwaysEditable
  );
  const allLocked = togglableClauses.every((c) => lockedClauses.has(c.id));

  function toggleAll() {
    if (allLocked) {
      // Unlock all togglable
      setLockedClauses((prev) => {
        const next = new Set(prev);
        togglableClauses.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      // Lock all togglable
      setLockedClauses((prev) => {
        const next = new Set(prev);
        togglableClauses.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/contracts"
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Contracts
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <div className="flex items-center gap-3">
              <H1 className="text-xl">{contractName}</H1>
              {/* Template type badge */}
              {meta.isTemplate && (
                <Badge
                  variant="outline"
                  className={cn(
                    "bg-transparent text-zinc-500 border-zinc-200",
                    meta.type === "standard" && "text-zinc-700"
                  )}
                >
                  {meta.type === "standard" ? "Standard" : "Custom"} Template
                </Badge>
              )}
              {/* Status badge for active contracts */}
              {!meta.isTemplate && meta.status && (
                <Badge
                  variant="outline"
                  className={cn("bg-transparent", statusConfig[meta.status]?.className)}
                >
                  {statusConfig[meta.status]?.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Active contract — link to client */}
              {!meta.isTemplate && meta.client && (
                <>
                  <Link
                    href={`/clients/${meta.clientId}`}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    <Building className="h-3 w-3" strokeWidth={1.5} />
                    {meta.client}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                  <span className="text-zinc-300">·</span>
                </>
              )}
              {/* Template — usage count */}
              {meta.isTemplate && meta.usageCount !== undefined && (
                <>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <ReceiptText className="h-3 w-3" strokeWidth={1.5} />
                    {meta.usageCount} uses
                  </span>
                  <span className="text-zinc-300">·</span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Lock className="h-3 w-3" strokeWidth={1.5} />
                    {meta.lockedClauses ?? 0} locked clause{(meta.lockedClauses ?? 0) !== 1 ? "s" : ""}
                  </span>
                  <span className="text-zinc-300">·</span>
                </>
              )}
              <Muted className="text-xs">
                {meta.isTemplate ? "Last modified" : "Created"} {meta.date}
              </Muted>
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Eye className="h-4 w-4" strokeWidth={1.5} />
            Preview
          </Button>
          {meta.isTemplate && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Copy className="h-4 w-4" strokeWidth={1.5} />
              Duplicate
            </Button>
          )}
          <Button size="sm" className="h-9 gap-1.5">
            <Save className="h-4 w-4" strokeWidth={1.5} />
            Save Template
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
          <div className="mx-auto max-w-4xl p-8 py-12">

            {activeTab === "editor" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Builder Header */}
                <div className="mb-8 border-b border-zinc-200 pb-6">
                  <H2>Agreement Template</H2>
                  <Muted className="mt-1 text-sm">
                    {contractDescription
                      ? contractDescription
                      : "Design the legal structure of your contract. Locked clauses cannot be edited when adding this to a proposal."}
                  </Muted>
                </div>

                {/* Clause Locking Banner */}
                <div className="mb-8 flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-zinc-900">Clause Locking</h4>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      Use the lock icon next to each clause to control which sections can be edited in proposals.{" "}
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
                {DEFAULT_CLAUSES.map((clause) => (
                  <ClauseBlock
                    key={clause.id}
                    clause={clause}
                    isLocked={lockedClauses.has(clause.id)}
                    content={clauseContents[clause.id]}
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
                        <Lock className="h-3 w-3 text-zinc-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{"{{client.name}}"}</div>
                        <div className="text-xs text-zinc-500 mt-1">{"{{client.email}}"}</div>
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
                        defaultValue={contractName}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Internal Description
                      </label>
                      <textarea
                        className="w-full flex rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 min-h-[100px]"
                        defaultValue={contractDescription || ""}
                      />
                    </div>
                  </div>
                </Surface>

                <Surface className="p-8">
                  <H3 className="text-base mb-6">Default Automations</H3>
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between border border-zinc-200 p-4 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">Auto-Reminders</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Send automatic reminders if unsigned</p>
                      </div>
                      <Badge variant="outline" className="bg-white">3 days before expiry</Badge>
                    </div>
                    <div className="flex items-center justify-between border border-zinc-200 p-4 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">Post-Signature Action</p>
                        <p className="text-xs text-zinc-500 mt-0.5">What happens after all parties sign</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-white">
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
