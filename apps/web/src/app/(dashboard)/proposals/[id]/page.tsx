"use client";

import * as React from "react";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PricingTierCard } from "@/components/ui/pricing-tier";
import { SignatureBlock } from "@/components/ui/signature-block";
import { MinimalEditor } from "@/components/editor/editor";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useProposal,
  useSaveProposalContent,
  useUpdateProposalStatus,
  type AddOnItem,
} from "@/lib/queries/proposals";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Lock,
  Sparkles,
  Check,
  X,
  Plus,
  Video,
  ImageIcon,
  FileText,
  Calendar,
  Clock,
  Shield,
  Wallet,
  Zap,
  Briefcase,
  Mail,
  Receipt,
  LayoutTemplate,
  CreditCard,
  Building,
  User,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Download,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "expired";

interface LegalClause {
  id: string;
  title: string;
  body: string;
  category: string;
}

interface Automation {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
}

type SectionKey = "welcome" | "scope" | "packages" | "agreement" | "payment";

/* ═══════════════════════════════════════════════════════
   STATIC CONFIG
   ═══════════════════════════════════════════════════════ */

const defaultAddOns: AddOnItem[] = [
  { id: "rush", label: "Rush Delivery (2-week)", price: 1500, enabled: false },
  { id: "seo", label: "SEO Audit & Optimization", price: 800, enabled: false },
  {
    id: "copywriting",
    label: "Professional Copywriting",
    price: 1200,
    enabled: false,
  },
  {
    id: "analytics",
    label: "Analytics Dashboard Setup",
    price: 600,
    enabled: false,
  },
];

const legalClauses: LegalClause[] = [
  {
    id: "ip",
    title: "Intellectual Property Transfer",
    body: "Upon receipt of full payment, all intellectual property rights, including but not limited to copyrights, trademarks, and trade secrets created during the course of this project, shall be irrevocably transferred to the Client.",
    category: "IP & Ownership",
  },
  {
    id: "confidentiality",
    title: "Confidentiality & Non-Disclosure",
    body: "Both parties agree to hold in confidence all proprietary information disclosed during the term of this agreement. This obligation extends for a period of two (2) years after the termination of this agreement.",
    category: "Legal",
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    body: "In no event shall the Service Provider be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly. Total liability shall not exceed the total amount paid under this agreement.",
    category: "Legal",
  },
  {
    id: "revisions",
    title: "Revision Policy",
    body: "This agreement includes two (2) rounds of revisions per deliverable. Additional revision rounds may be requested at a rate of $150/hour. A revision is defined as minor adjustments to approved concepts, not a fundamental change in direction.",
    category: "Scope",
  },
  {
    id: "termination",
    title: "Termination Clause",
    body: "Either party may terminate this agreement with fourteen (14) days written notice. Upon termination, the Client shall pay for all work completed to date. Any escrowed funds for uncompleted milestones shall be returned within five (5) business days.",
    category: "Legal",
  },
];

const contractTemplates = [
  { id: "t1", name: "Master Services Agreement", type: "standard" },
  { id: "t2", name: "Independent Contractor Agreement", type: "standard" },
  { id: "t3", name: "Web Development SOW", type: "custom" },
];

const sections: { key: SectionKey; label: string; icon: React.ElementType }[] =
  [
    { key: "welcome", label: "Welcome", icon: FileText },
    { key: "scope", label: "Scope", icon: LayoutTemplate },
    { key: "packages", label: "Packages", icon: CreditCard },
    { key: "agreement", label: "Agreement", icon: Shield },
    { key: "payment", label: "Payment", icon: Wallet },
  ];

const statusConfig: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "text-zinc-500 border-zinc-200" },
  sent: { label: "Sent", className: "text-zinc-700 border-zinc-300" },
  viewed: { label: "Viewed", className: "text-zinc-700 border-zinc-300" },
  signed: {
    label: "Signed",
    className: "text-zinc-900 border-zinc-900 font-bold",
  },
  expired: { label: "Expired", className: "text-zinc-400 border-zinc-200" },
};

const tierPrices: Record<string, number> = {
  foundation: 2500,
  scale: 5500,
  enterprise: 9500,
};

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function ProposalBuilderPage() {
  const params = useParams();
  const proposalId = params.id as string;

  // ── Data ────────────────────────────────────────────
  const { data: proposalData, isLoading, isError } = useProposal(proposalId);
  const saveDraft = useSaveProposalContent();
  const updateStatus = useUpdateProposalStatus();

  // ── Local state ──────────────────────────────────────
  const [initialized, setInitialized] = React.useState(false);
  const [activeSection, setActiveSection] =
    React.useState<SectionKey>("welcome");
  const [welcomeMessage, setWelcomeMessage] = React.useState("");
  const [scopeContent, setScopeContent] = React.useState("");
  const [selectedTier, setSelectedTier] = React.useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] =
    React.useState<string>("t1");
  const [addOns, setAddOns] = React.useState<AddOnItem[]>(defaultAddOns);
  const [enabledClauses, setEnabledClauses] = React.useState<string[]>(
    legalClauses.map((c) => c.id)
  );
  const [depositPercent, setDepositPercent] = React.useState(50);
  const [milestonesCount, setMilestonesCount] = React.useState(3);
  const [aiSuggestions, setAiSuggestions] = React.useState(false);
  const [automations, setAutomations] = React.useState<Automation[]>([
    {
      id: "project",
      label: "Create Project",
      description: "Auto-create a project in the Kanban board",
      enabled: true,
      icon: Briefcase,
    },
    {
      id: "template",
      label: "Apply Task Template",
      description: "Pre-populate tasks from template",
      enabled: true,
      icon: LayoutTemplate,
    },
    {
      id: "email",
      label: "Send Welcome Email",
      description: "Trigger onboarding email to client",
      enabled: true,
      icon: Mail,
    },
    {
      id: "invoice",
      label: "Generate First Invoice",
      description: "Create deposit invoice automatically",
      enabled: false,
      icon: Receipt,
    },
  ]);
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);

  // ── Initialize local state from DB once ─────────────
  React.useEffect(() => {
    if (proposalData && !initialized) {
      setWelcomeMessage(proposalData.welcomeMessage ?? "");
      setDepositPercent(proposalData.depositPercent ?? 50);
      setMilestonesCount(proposalData.milestones ?? 3);

      const meta = proposalData.metadata ?? {};

      const savedScope = meta.scope_content as string | undefined;
      if (savedScope) setScopeContent(savedScope);

      const savedTier = meta.selected_tier as string | undefined;
      if (savedTier) setSelectedTier(savedTier);

      const savedAddOns = meta.add_ons as AddOnItem[] | undefined;
      if (savedAddOns && savedAddOns.length > 0) setAddOns(savedAddOns);

      const savedClauses = meta.enabled_clauses as string[] | undefined;
      if (savedClauses) setEnabledClauses(savedClauses);

      const savedAutomations = meta.automations as
        | Array<{ id: string; enabled: boolean }>
        | undefined;
      if (savedAutomations) {
        setAutomations((prev) =>
          prev.map((a) => {
            const saved = savedAutomations.find((s) => s.id === a.id);
            return saved ? { ...a, enabled: saved.enabled } : a;
          })
        );
      }

      const savedReminder = meta.reminder_enabled as boolean | undefined;
      if (savedReminder !== undefined) setReminderEnabled(savedReminder);

      setInitialized(true);
    }
  }, [proposalData, initialized]);

  /* ── PDF export ────────────────────────────────────── */
  const handleExportPdf = React.useCallback(async () => {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/pdf`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${proposalId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[pdf export]", err);
    } finally {
      setExportingPdf(false);
    }
  }, [proposalId]);

  /* ── Preview (open PDF in new tab) ─────────────────── */
  const handlePreview = React.useCallback(() => {
    window.open(`/api/proposals/${proposalId}/pdf`, "_blank");
  }, [proposalId]);

  /* ── Save Draft ────────────────────────────────────── */
  const handleSaveDraft = React.useCallback(async () => {
    try {
      await saveDraft.mutateAsync({
        id: proposalId,
        welcomeMessage,
        scopeContent,
        selectedTier,
        addOns,
        enabledClauses,
        depositPercent,
        milestones: milestonesCount,
        automations: automations.map((a) => ({ id: a.id, enabled: a.enabled })),
        reminderEnabled,
      });
      setSavedAt(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    } catch (err) {
      console.error("[save draft]", err);
    }
  }, [
    proposalId,
    welcomeMessage,
    scopeContent,
    selectedTier,
    addOns,
    enabledClauses,
    depositPercent,
    milestonesCount,
    automations,
    reminderEnabled,
    saveDraft,
  ]);

  /* ── Send to Client ────────────────────────────────── */
  const handleConfirmSend = React.useCallback(async () => {
    try {
      await updateStatus.mutateAsync({ id: proposalId, status: "sent" });
      setSendConfirmOpen(false);
    } catch (err) {
      console.error("[send proposal]", err);
    }
  }, [proposalId, updateStatus]);

  /* ── Pricing calculations ───────────────────────────── */
  const selectedTierPrice = selectedTier ? (tierPrices[selectedTier] ?? 0) : 0;
  const addOnsTotal = addOns
    .filter((a) => a.enabled)
    .reduce((s, a) => s + a.price, 0);
  const subtotal = selectedTierPrice + addOnsTotal;
  const deposit = Math.round(subtotal * (depositPercent / 100));
  const balance = subtotal - deposit;

  const toggleAddOn = (id: string) => {
    setAddOns((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const toggleClause = (id: string) => {
    setEnabledClauses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  /* ── Loading state ──────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px] gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────── */
  if (isError || !proposalData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
        <p className="text-sm text-zinc-500">Proposal not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/proposals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Link>
        </Button>
      </div>
    );
  }

  const proposal = proposalData;
  const proposalStatus = proposal.status as ProposalStatus;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
        {/* LEFT: back link + title + badge + meta */}
        <div className="flex flex-col min-w-0 flex-1 w-full">
          <Link
            href="/proposals"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Proposals
          </Link>

          <div className="flex items-center gap-2 min-w-0 mb-1">
            <H1 className="text-2xl font-medium truncate min-w-0">
              {proposal.title}
            </H1>
            <Badge
              variant="outline"
              className={cn(
                "flex-shrink-0 bg-transparent shrink-0",
                statusConfig[proposalStatus]?.className
              )}
            >
              {statusConfig[proposalStatus]?.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground min-w-0">
            {proposal.clientId ? (
              <Link
                href={`/clients/${proposal.clientId}`}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap"
              >
                <Building className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{proposal.client}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <User className="h-3.5 w-3.5 shrink-0" />
                No client assigned
              </span>
            )}
            <span className="flex-shrink-0 text-zinc-300">•</span>
            <span className="whitespace-nowrap">
              Created {proposal.createdAt}
            </span>
            {savedAt && (
              <>
                <span className="flex-shrink-0 text-zinc-300">•</span>
                <span className="whitespace-nowrap text-zinc-400">
                  Saved at {savedAt}
                </span>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none h-9"
            onClick={handlePreview}
          >
            <Eye className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none h-9"
            onClick={handleExportPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
            )}
            <span className="hidden sm:inline">
              {exportingPdf ? "Generating…" : "Export PDF"}
            </span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none h-9"
            onClick={handleSaveDraft}
            disabled={saveDraft.isPending}
          >
            {saveDraft.isPending ? (
              <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
            )}
            <span className="hidden sm:inline">
              {saveDraft.isPending ? "Saving…" : "Save Draft"}
            </span>
            <span className="inline sm:hidden">Save</span>
          </Button>
          <Button
            className="flex-1 sm:flex-none h-9"
            onClick={() => setSendConfirmOpen(true)}
            disabled={
              proposalStatus === "signed" || proposalStatus === "expired"
            }
          >
            <Send className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {proposalStatus === "sent" || proposalStatus === "viewed"
                ? "Resend"
                : "Send to Client"}
            </span>
            <span className="inline sm:hidden">Send</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px] gap-6">
        {/* ══ LEFT: Section Navigation ══════════ */}
        <div className="space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold px-3 mb-3">
            Sections
          </Muted>
          {sections.map((section, i) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold",
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {i + 1}
                </div>
                <span>{section.label}</span>
                <Icon
                  className={cn(
                    "h-4 w-4 ml-auto",
                    isActive ? "text-zinc-900" : "text-zinc-400"
                  )}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}

          {/* Dynamic Total Readout */}
          {subtotal > 0 && (
            <Surface className="p-4 mt-4 space-y-2">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">
                Proposal Total
              </Muted>
              <Separator />
              <div className="space-y-1.5">
                {selectedTier && (
                  <div className="flex justify-between text-xs text-zinc-600 gap-2">
                    <span className="capitalize truncate min-w-0">
                      {selectedTier} Package
                    </span>
                    <span className="shrink-0">
                      ${selectedTierPrice.toLocaleString()}
                    </span>
                  </div>
                )}
                {addOns
                  .filter((a) => a.enabled)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex justify-between text-xs text-zinc-600 gap-2"
                    >
                      <span className="truncate min-w-0">{a.label}</span>
                      <span className="shrink-0">
                        +${a.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                <Separator />
                <div className="flex justify-between text-sm font-bold text-zinc-900 gap-2">
                  <span className="truncate min-w-0">Subtotal</span>
                  <span className="shrink-0">${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 gap-2">
                  <span className="truncate min-w-0">
                    Deposit ({depositPercent}%)
                  </span>
                  <span className="shrink-0">${deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 gap-2">
                  <span className="truncate min-w-0">Balance Due</span>
                  <span className="shrink-0">${balance.toLocaleString()}</span>
                </div>
              </div>
            </Surface>
          )}
        </div>

        {/* ══ CENTER: Section Content ══════════ */}
        <div className="space-y-6">
          {/* ── Welcome Section ─────────────── */}
          {activeSection === "welcome" && (
            <>
              <Surface className="p-0 overflow-hidden">
                <div className="h-48 bg-zinc-100 flex items-center justify-center border-b border-zinc-200 border-dashed">
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <ImageIcon className="h-8 w-8" strokeWidth={1.5} />
                    <span className="text-xs font-medium">
                      Drop a hero image or click to upload
                    </span>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <H2 className="text-[clamp(1.5rem,3vw,1.875rem)] font-bold tracking-tight truncate">
                      {proposal.title}
                    </H2>
                    <Muted className="truncate">{proposal.client}</Muted>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <label className="text-xs font-medium text-zinc-700 uppercase tracking-widest">
                      Welcome Message
                    </label>
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Write a personalized welcome message for your client…"
                      rows={5}
                      className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 focus-visible:ring-2"
                    />
                  </div>
                </div>
              </Surface>

              {/* Video embed placeholder */}
              <Surface className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                  <H3 className="text-sm">Welcome Video</H3>
                </div>
                <div className="h-32 rounded-md border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <Video className="h-6 w-6" strokeWidth={1.5} />
                    <span className="text-xs">
                      Paste a YouTube or Loom URL
                    </span>
                    <Input
                      placeholder="https://www.loom.com/share/..."
                      className="max-w-sm h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </Surface>

              {/* Smart Fields Preview */}
              <Surface className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className="h-4 w-4 text-zinc-500"
                    strokeWidth={1.5}
                  />
                  <H3 className="text-sm">Smart Fields</H3>
                  <Badge
                    variant="outline"
                    className="text-[10px] ml-auto"
                  >
                    Auto-populated
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { token: "{{client.name}}", value: proposal.client },
                    {
                      token: "{{client.email}}",
                      value: proposal.clientEmail ?? "—",
                    },
                    {
                      token: "{{project.startDate}}",
                      value: "Set after signing",
                    },
                    { token: "{{project.endDate}}", value: "Set after signing" },
                  ].map((field) => (
                    <div
                      key={field.token}
                      className="rounded-md border border-zinc-200 bg-zinc-50 p-3 min-w-0 flex flex-col"
                    >
                      <Muted className="text-[10px] font-mono truncate">
                        {field.token}
                      </Muted>
                      <div className="text-sm font-medium text-zinc-900 mt-0.5 truncate">
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </>
          )}

          {/* ── Scope Section ──────────────── */}
          {activeSection === "scope" && (
            <Surface className="p-8 space-y-6">
              <div className="space-y-2">
                <H2 className="text-2xl tracking-tight">
                  Project Scope & Deliverables
                </H2>
                <Muted>
                  Detail your deliverables, timelines, and milestones. Smart
                  Fields like{" "}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] font-mono text-zinc-600">
                    <Sparkles className="h-2.5 w-2.5" />
                    {"{{client.name}}"}
                  </span>{" "}
                  will auto-populate for the client.
                </Muted>
              </div>
              <Separator />
              <MinimalEditor
                content={scopeContent}
                onChange={setScopeContent}
                className="border-none p-0"
                placeholder="Describe the project scope, deliverables, timeline, and milestones..."
              />
            </Surface>
          )}

          {/* ── Packages Section ───────────── */}
          {activeSection === "packages" && (
            <>
              <Surface className="p-8 space-y-8">
                <div className="space-y-1">
                  <H2 className="text-2xl tracking-tight">Service Packages</H2>
                  <Muted>
                    Clients select their preferred tier. The total updates
                    dynamically.
                  </Muted>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PricingTierCard
                    title="Foundation"
                    price="$2,500"
                    description="Core setup and essential features."
                    features={[
                      "5 Core Landing Pages",
                      "Contact Integration",
                      "Basic SEO Setup",
                      "2 Revision Rounds",
                    ]}
                    isSelected={selectedTier === "foundation"}
                    onSelect={() =>
                      setSelectedTier(
                        selectedTier === "foundation" ? null : "foundation"
                      )
                    }
                  />
                  <PricingTierCard
                    title="Scale"
                    price="$5,500"
                    description="Advanced features for growing teams."
                    features={[
                      "Everything in Foundation",
                      "E-Commerce Setup",
                      "Analytics Dashboard",
                      "Priority Support",
                    ]}
                    isSelected={selectedTier === "scale"}
                    onSelect={() =>
                      setSelectedTier(
                        selectedTier === "scale" ? null : "scale"
                      )
                    }
                  />
                  <PricingTierCard
                    title="Enterprise"
                    price="$9,500"
                    description="Full-service for established brands."
                    features={[
                      "Everything in Scale",
                      "Custom Integrations",
                      "Dedicated Account Manager",
                      "Unlimited Revisions",
                    ]}
                    isSelected={selectedTier === "enterprise"}
                    onSelect={() =>
                      setSelectedTier(
                        selectedTier === "enterprise" ? null : "enterprise"
                      )
                    }
                  />
                </div>
                <Button variant="outline" className="w-full border-dashed">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Tier
                </Button>
              </Surface>

              {/* Add-ons */}
              <Surface className="p-8 space-y-6">
                <div className="space-y-1">
                  <H3>Optional Add-ons</H3>
                  <Muted className="text-xs">
                    Clients can toggle these to customize their package.
                  </Muted>
                </div>
                <div className="space-y-2">
                  {addOns.map((addon) => (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddOn(addon.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-md border cursor-pointer transition-all",
                        addon.enabled
                          ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center",
                            addon.enabled
                              ? "bg-zinc-900 border-zinc-900"
                              : "border-zinc-300"
                          )}
                        >
                          {addon.enabled && (
                            <Check
                              className="h-3 w-3 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        <span className="text-sm font-medium text-zinc-900 truncate min-w-0">
                          {addon.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">
                        +${addon.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Surface>

              {/* Dynamic Total (Mobile/Medium screens) */}
              <Surface className="p-6 space-y-3 lg:hidden">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">
                  Proposal Total
                </Muted>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-zinc-900 gap-2">
                  <span className="truncate min-w-0">Subtotal</span>
                  <span className="shrink-0">${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500 gap-2">
                  <span className="truncate min-w-0">
                    Deposit ({depositPercent}%)
                  </span>
                  <span className="shrink-0">${deposit.toLocaleString()}</span>
                </div>
              </Surface>
            </>
          )}

          {/* ── Agreement Section ──────────── */}
          {activeSection === "agreement" && (
            <>
              <Surface className="p-8 space-y-6">
                <div className="space-y-1">
                  <H2 className="text-2xl tracking-tight">Legal Agreement</H2>
                  <Muted>
                    Select a base template from your library. Toggle clauses on
                    or off as needed.
                  </Muted>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">
                    Selected Template
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {contractTemplates.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={cn(
                          "flex flex-col gap-2 p-4 rounded-md border cursor-pointer transition-all",
                          selectedTemplateId === t.id
                            ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50"
                            : "border-zinc-200 hover:border-zinc-300 bg-white"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-sm bg-white border border-zinc-200 shadow-sm flex items-center justify-center flex-shrink-0">
                              {t.type === "standard" ? (
                                <Shield className="h-3 w-3 text-zinc-700" />
                              ) : (
                                <FileText className="h-3 w-3 text-zinc-500" />
                              )}
                            </div>
                            <span className="text-sm font-semibold text-zinc-900">
                              {t.name}
                            </span>
                          </div>
                          {selectedTemplateId === t.id && (
                            <Check className="h-4 w-4 text-zinc-900 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setAiSuggestions(!aiSuggestions)}
                  >
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                    {aiSuggestions ? "Hide Suggestions" : "Suggest Clauses"}
                  </Button>
                  <Muted className="text-xs">
                    AI analyzes your scope to recommend relevant legal terms.
                  </Muted>
                </div>

                {aiSuggestions && (
                  <Surface className="p-4 space-y-3 bg-zinc-50 border-dashed">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-zinc-500" />
                      <span className="text-xs font-semibold text-zinc-700">
                        AI-Suggested Clauses
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        {
                          title: "Source Code Ownership",
                          body: "All source code produced shall be owned by the Client upon final payment completion.",
                        },
                        {
                          title: "Third-Party License Disclosure",
                          body: "Provider shall disclose all third-party libraries and their respective licenses used in development.",
                        },
                      ].map((suggestion) => (
                        <div
                          key={suggestion.title}
                          className="flex items-start justify-between p-3 rounded-md border border-zinc-200 bg-white"
                        >
                          <div className="flex-1 mr-4">
                            <div className="text-sm font-medium text-zinc-900">
                              {suggestion.title}
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                              {suggestion.body}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px]"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <X className="h-3 w-3 text-zinc-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Surface>
                )}

                <div className="space-y-3">
                  {legalClauses.map((clause) => {
                    const isEnabled = enabledClauses.includes(clause.id);
                    return (
                      <div
                        key={clause.id}
                        className={cn(
                          "rounded-md border transition-all",
                          isEnabled
                            ? "border-zinc-200 bg-zinc-50"
                            : "border-zinc-100 bg-zinc-50/50 opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <Lock
                              className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0"
                              strokeWidth={1.5}
                            />
                            <span className="text-sm font-semibold text-zinc-900 truncate">
                              {clause.title}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-zinc-300 text-zinc-500"
                            >
                              Legally Vetted
                            </Badge>
                          </div>
                          <button onClick={() => toggleClause(clause.id)}>
                            {isEnabled ? (
                              <ToggleRight className="h-5 w-5 text-zinc-900" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-zinc-400" />
                            )}
                          </button>
                        </div>
                        {isEnabled && (
                          <div className="px-4 py-3">
                            <p className="text-xs text-zinc-600 leading-relaxed">
                              {clause.body}
                            </p>
                            <Muted className="text-[9px] mt-2 flex items-center gap-1">
                              <Shield className="h-2.5 w-2.5" />
                              {clause.category} · Cannot be edited
                            </Muted>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Surface>

              <Surface className="p-8 space-y-6">
                <H3>E-Signatures</H3>
                <P className="text-sm text-zinc-500 italic">
                  This document is cryptographically hashed (SHA-256) once
                  signed. IP address and UTC timestamp are recorded.
                </P>
                <div className="flex flex-wrap gap-8 pt-2">
                  <SignatureBlock label="Freelancer Signature" />
                  <SignatureBlock
                    label="Client Signature"
                    className="opacity-50 pointer-events-none"
                  />
                </div>
              </Surface>
            </>
          )}

          {/* ── Payment Section ────────────── */}
          {activeSection === "payment" && (
            <>
              <Surface className="p-8 space-y-6">
                <div className="space-y-1">
                  <H2 className="text-2xl tracking-tight">
                    Payment & Escrow
                  </H2>
                  <Muted>
                    Configure the deposit and milestone payment structure. Funds
                    are held securely via Stripe Connect.
                  </Muted>
                </div>
                <Separator />

                {/* Deposit % slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold">
                      Deposit Percentage
                    </Muted>
                    <span className="text-sm font-semibold text-zinc-900">
                      {depositPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(Number(e.target.value))}
                    className="w-full accent-zinc-900"
                  />
                </div>

                {/* Milestones */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold">
                      Number of Milestones
                    </Muted>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setMilestonesCount((n) => Math.max(1, n - 1))
                        }
                        className="h-6 w-6 rounded border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"
                      >
                        –
                      </button>
                      <span className="text-sm font-semibold text-zinc-900 w-4 text-center">
                        {milestonesCount}
                      </span>
                      <button
                        onClick={() =>
                          setMilestonesCount((n) => Math.min(10, n + 1))
                        }
                        className="h-6 w-6 rounded border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Escrow Split Visualizer */}
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-zinc-900 rounded-l-full transition-all"
                      style={{ width: `${depositPercent}%` }}
                    />
                    {milestonesCount > 1 &&
                      Array.from({ length: milestonesCount - 1 }).map(
                        (_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "transition-all",
                              i % 2 === 0 ? "bg-zinc-400" : "bg-zinc-300"
                            )}
                            style={{
                              width: `${(100 - depositPercent) / (milestonesCount - 1)}%`,
                            }}
                          />
                        )
                      )}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Deposit ({depositPercent}%)</span>
                    <span>
                      {milestonesCount - 1} Milestone
                      {milestonesCount - 1 !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Payment Summary */}
                <Surface className="p-4 space-y-2 bg-zinc-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-semibold text-zinc-900">
                      {subtotal > 0 ? `$${subtotal.toLocaleString()}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">
                      Deposit Due ({depositPercent}%)
                    </span>
                    <span className="font-bold text-zinc-900">
                      {deposit > 0 ? `$${deposit.toLocaleString()}` : "—"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">
                      Balance (on milestones)
                    </span>
                    <span className="text-zinc-700">
                      {balance > 0 ? `$${balance.toLocaleString()}` : "—"}
                    </span>
                  </div>
                </Surface>

                {subtotal === 0 && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Select a package in the Packages section to calculate
                    totals.
                  </div>
                )}
              </Surface>

              {/* Stripe Placeholder */}
              <Surface className="p-8 space-y-6">
                <H3>Payment Method</H3>
                <Muted className="text-xs">
                  Clients will see a secure Stripe checkout here.
                </Muted>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Card Number
                    </label>
                    <div className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 flex items-center text-sm text-zinc-400">
                      <CreditCard className="h-4 w-4 mr-2 text-zinc-300" />
                      •••• •••• •••• ••••
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">
                        Expiry
                      </label>
                      <div className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 flex items-center text-sm text-zinc-400">
                        MM / YY
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">
                        CVC
                      </label>
                      <div className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 flex items-center text-sm text-zinc-400">
                        •••
                      </div>
                    </div>
                  </div>
                </div>
                <Surface className="p-3 bg-zinc-900 text-white">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                    <span className="text-xs text-zinc-400">
                      Encrypted via Stripe · PCI-DSS Compliant · Funds
                      escrowed until milestone approval
                    </span>
                  </div>
                </Surface>
              </Surface>
            </>
          )}
        </div>

        {/* ══ RIGHT: Settings Sidebar ══════════ */}
        <div className="space-y-4">
          {/* Proposal Info */}
          <Surface className="p-5 space-y-4">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">
              Proposal Details
            </Muted>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  Client
                </label>
                <div className="flex items-center gap-2 text-sm text-zinc-900 font-medium">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  {proposal.client}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  Template
                </label>
                <div className="flex items-center gap-2 text-sm text-zinc-700">
                  <LayoutTemplate className="h-3.5 w-3.5 text-zinc-400" />
                  {proposal.template}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  Escrow Split
                </label>
                <div className="flex items-center gap-2 text-sm text-zinc-700">
                  <Wallet className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  {depositPercent}% Deposit · {milestonesCount} Milestone
                  {milestonesCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </Surface>

          {/* Expiration & Reminders */}
          <Surface className="p-5 space-y-4">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">
              Expiration
            </Muted>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  Expires On
                </label>
                <div className="flex items-center gap-2 text-sm text-zinc-700">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  {proposal.expiresAt || "No expiration set"}
                </div>
              </div>
              <div
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-700">
                    Auto-remind 3 days before
                  </span>
                </div>
                {reminderEnabled ? (
                  <ToggleRight className="h-5 w-5 text-zinc-900" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-zinc-400" />
                )}
              </div>
            </div>
          </Surface>

          {/* Analytics */}
          <Surface className="p-5 space-y-4">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">
              Analytics
            </Muted>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Eye className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  Total Views
                </div>
                <span className="text-sm font-semibold text-zinc-900">
                  {proposal.viewCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  Avg. Time Spent
                </div>
                <span className="text-sm font-medium text-zinc-700">
                  {proposal.avgTimeSpent}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  Last Viewed
                </div>
                <span className="text-sm text-zinc-700">
                  {proposal.viewedAt || "—"}
                </span>
              </div>
            </div>
          </Surface>

          {/* Post-Acceptance Automations */}
          <Surface className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
              <Muted className="text-[10px] uppercase tracking-widest font-bold">
                On Acceptance
              </Muted>
            </div>
            <Muted className="text-[10px] leading-relaxed">
              These actions trigger automatically when the client signs and
              pays.
            </Muted>
            <div className="space-y-2">
              {automations.map((auto) => {
                const Icon = auto.icon;
                return (
                  <div
                    key={auto.id}
                    onClick={() => toggleAutomation(auto.id)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-3.5 w-3.5 text-zinc-400"
                        strokeWidth={1.5}
                      />
                      <div>
                        <span className="text-xs font-medium text-zinc-900 block">
                          {auto.label}
                        </span>
                        <Muted className="text-[9px]">{auto.description}</Muted>
                      </div>
                    </div>
                    {auto.enabled ? (
                      <ToggleRight className="h-5 w-5 text-zinc-900 flex-shrink-0" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </Surface>

          {/* Version History */}
          <Surface className="p-5 space-y-4">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">
              Version History
            </Muted>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-zinc-900">
                    v1
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    Current
                  </Badge>
                </div>
                <Muted className="text-[10px]">{proposal.createdAt}</Muted>
              </div>
            </div>
          </Surface>
        </div>
      </div>

      {/* ── Send Confirmation Modal ──────────── */}
      {sendConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-zinc-900/30"
            onClick={() => setSendConfirmOpen(false)}
          />
          <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <Send className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
              </div>
              <div>
                <H3 className="text-base">Send Proposal?</H3>
                <Muted className="text-xs mt-1 leading-relaxed">
                  This will mark the proposal as sent.
                  {proposal.clientEmail && (
                    <> Client email: {proposal.clientEmail}.</>
                  )}
                  {!proposal.clientEmail && (
                    <> No client email on file — share the proposal link manually.</>
                  )}
                </Muted>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSendConfirmOpen(false)}
                disabled={updateStatus.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={updateStatus.isPending}
                onClick={handleConfirmSend}
              >
                {updateStatus.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Proposal"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
