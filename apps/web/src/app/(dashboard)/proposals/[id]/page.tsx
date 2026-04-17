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
  type CustomTierItem,
} from "@/lib/queries/proposals";
import {
  usePaymentMethods,
  RAIL_META,
} from "@/lib/queries/payment-methods";
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
  Trash2,
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
  Link2,
  Copy,
  CheckCircle2,
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
   HELPERS
   ═══════════════════════════════════════════════════════ */

function getEmbedUrl(url: string): string | null {
  if (!url.trim()) return null;
  // YouTube
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Loom
  const loom = url.match(/loom\.com\/share\/([A-Za-z0-9]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  return null;
}

/* ═══════════════════════════════════════════════════════
   STATIC CONFIG
   ═══════════════════════════════════════════════════════ */

const defaultAddOns: AddOnItem[] = [
  { id: "rush", label: "Rush Delivery (2-week)", price: 1500, enabled: false },
  { id: "seo", label: "SEO Audit & Optimization", price: 800, enabled: false },
  { id: "copywriting", label: "Professional Copywriting", price: 1200, enabled: false },
  { id: "analytics", label: "Analytics Dashboard Setup", price: 600, enabled: false },
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
    body: "In no event shall the Service Provider be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues. Total liability shall not exceed the total amount paid under this agreement.",
    category: "Legal",
  },
  {
    id: "revisions",
    title: "Revision Policy",
    body: "This agreement includes two (2) rounds of revisions per deliverable. Additional revision rounds may be requested at a rate of $150/hour.",
    category: "Scope",
  },
  {
    id: "termination",
    title: "Termination Clause",
    body: "Either party may terminate this agreement with fourteen (14) days written notice. Upon termination, the Client shall pay for all work completed to date.",
    category: "Legal",
  },
];

const AI_SUGGESTED_CLAUSES = [
  {
    title: "Source Code Ownership",
    body: "All source code produced shall be owned by the Client upon final payment completion.",
  },
  {
    title: "Third-Party License Disclosure",
    body: "Provider shall disclose all third-party libraries and their respective licenses used in development.",
  },
];

const contractTemplates = [
  { id: "t1", name: "Master Services Agreement", type: "standard" },
  { id: "t2", name: "Independent Contractor Agreement", type: "standard" },
  { id: "t3", name: "Web Development SOW", type: "custom" },
];

const sections: { key: SectionKey; label: string; icon: React.ElementType }[] = [
  { key: "welcome", label: "Welcome", icon: FileText },
  { key: "scope", label: "Scope", icon: LayoutTemplate },
  { key: "packages", label: "Packages", icon: CreditCard },
  { key: "agreement", label: "Agreement", icon: Shield },
  { key: "payment", label: "Payment", icon: Wallet },
];

const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "text-zinc-500 border-zinc-200" },
  sent: { label: "Sent", className: "text-zinc-700 border-zinc-300" },
  viewed: { label: "Viewed", className: "text-zinc-700 border-zinc-300" },
  signed: { label: "Signed", className: "text-zinc-900 border-zinc-900 font-bold" },
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

  // ── UI state ─────────────────────────────────────────
  const [initialized, setInitialized] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<SectionKey>("welcome");

  // Welcome
  const [welcomeMessage, setWelcomeMessage] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [videoInput, setVideoInput] = React.useState("");

  // Scope
  const [scopeContent, setScopeContent] = React.useState("");

  // Packages
  const [selectedTier, setSelectedTier] = React.useState<string | null>(null);
  const [addOns, setAddOns] = React.useState<AddOnItem[]>(defaultAddOns);
  const [customTiers, setCustomTiers] = React.useState<CustomTierItem[]>([]);
  const [customTierOpen, setCustomTierOpen] = React.useState(false);
  const [newTierTitle, setNewTierTitle] = React.useState("");
  const [newTierPrice, setNewTierPrice] = React.useState("");
  const [newTierDesc, setNewTierDesc] = React.useState("");
  const [newTierFeatures, setNewTierFeatures] = React.useState("");

  // Agreement
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("t1");
  const [enabledClauses, setEnabledClauses] = React.useState<string[]>(
    legalClauses.map((c) => c.id)
  );
  const [extraClauses, setExtraClauses] = React.useState<
    Array<{ title: string; body: string }>
  >([]);
  const [aiSuggestions, setAiSuggestions] = React.useState(false);

  // Payment
  const [depositPercent, setDepositPercent] = React.useState(50);
  const [milestonesCount, setMilestonesCount] = React.useState(3);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = React.useState<string[]>([]);

  // Connected payout rails
  const { data: paymentMethods = [] } = usePaymentMethods();

  // Sidebar
  const [automations, setAutomations] = React.useState<Automation[]>([
    { id: "project", label: "Create Project", description: "Auto-create a project in the Kanban board", enabled: true, icon: Briefcase },
    { id: "template", label: "Apply Task Template", description: "Pre-populate tasks from template", enabled: true, icon: LayoutTemplate },
    { id: "email", label: "Send Welcome Email", description: "Trigger onboarding email to client", enabled: true, icon: Mail },
    { id: "invoice", label: "Generate First Invoice", description: "Create deposit invoice automatically", enabled: false, icon: Receipt },
  ]);
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [expiresAt, setExpiresAt] = React.useState("");

  // Actions
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [linkCopied, setLinkCopied] = React.useState(false);

  // ── Initialize from DB ──────────────────────────────
  React.useEffect(() => {
    if (proposalData && !initialized) {
      const meta = proposalData.metadata ?? {};

      setWelcomeMessage(proposalData.welcomeMessage ?? "");
      setDepositPercent(proposalData.depositPercent ?? 50);
      setMilestonesCount(proposalData.milestones ?? 3);

      const savedScope = meta.scope_content as string | undefined;
      if (savedScope) setScopeContent(savedScope);

      const savedTier = meta.selected_tier as string | undefined;
      if (savedTier) setSelectedTier(savedTier);

      const savedAddOns = meta.add_ons as AddOnItem[] | undefined;
      if (savedAddOns?.length) setAddOns(savedAddOns);

      const savedCustomTiers = meta.custom_tiers as CustomTierItem[] | undefined;
      if (savedCustomTiers?.length) setCustomTiers(savedCustomTiers);

      const savedClauses = meta.enabled_clauses as string[] | undefined;
      if (savedClauses) setEnabledClauses(savedClauses);

      const savedExtra = meta.extra_clauses as Array<{ title: string; body: string }> | undefined;
      if (savedExtra?.length) setExtraClauses(savedExtra);

      const savedAutomations = meta.automations as Array<{ id: string; enabled: boolean }> | undefined;
      if (savedAutomations) {
        setAutomations((prev) =>
          prev.map((a) => {
            const s = savedAutomations.find((x) => x.id === a.id);
            return s ? { ...a, enabled: s.enabled } : a;
          })
        );
      }

      const savedReminder = meta.reminder_enabled as boolean | undefined;
      if (savedReminder !== undefined) setReminderEnabled(savedReminder);

      const savedExpiry = meta.expires_at as string | undefined;
      if (savedExpiry) setExpiresAt(new Date(savedExpiry).toISOString().slice(0, 10));

      const savedVideo = meta.video_url as string | undefined;
      if (savedVideo) { setVideoUrl(savedVideo); setVideoInput(savedVideo); }

      const savedPaymentMethods = meta.accepted_payment_methods as string[] | undefined;
      if (savedPaymentMethods?.length) setAcceptedPaymentMethods(savedPaymentMethods);

      setInitialized(true);
    }
  }, [proposalData, initialized]);

  /* ── Helpers ────────────────────────────────────────── */

  const embedUrl = React.useMemo(() => getEmbedUrl(videoUrl), [videoUrl]);

  const handleApplyVideoUrl = () => {
    setVideoUrl(videoInput.trim());
  };

  const handleAddCustomTier = () => {
    if (!newTierTitle.trim() || !newTierPrice) return;
    const tier: CustomTierItem = {
      id: `custom-${Date.now()}`,
      title: newTierTitle.trim(),
      price: Number(newTierPrice) || 0,
      description: newTierDesc.trim(),
      features: newTierFeatures
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    };
    setCustomTiers((prev) => [...prev, tier]);
    setNewTierTitle("");
    setNewTierPrice("");
    setNewTierDesc("");
    setNewTierFeatures("");
    setCustomTierOpen(false);
  };

  const handleRemoveCustomTier = (id: string) => {
    setCustomTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddSuggestedClause = (clause: { title: string; body: string }) => {
    setExtraClauses((prev) => {
      if (prev.some((c) => c.title === clause.title)) return prev;
      return [...prev, clause];
    });
  };

  const handleRemoveExtraClause = (title: string) => {
    setExtraClauses((prev) => prev.filter((c) => c.title !== title));
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${proposalId}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  /* ── PDF export ─────────────────────────────────────── */
  const handleExportPdf = React.useCallback(async () => {
    setExportingPdf(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/pdf`);
      if (!res.ok) {
        const msg = await res.text().catch(() => "Unknown error");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[pdf export]", err);
      setExportError(err instanceof Error ? err.message : "PDF generation failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }, [proposalId]);

  /* ── Preview ────────────────────────────────────────── */
  const handlePreview = React.useCallback(() => {
    // Opens the client-facing web view with a preview banner.
    // This is exactly what the client will see when you send the proposal.
    window.open(`/p/${proposalId}?preview=1`, "_blank");
  }, [proposalId]);

  /* ── Save Draft ─────────────────────────────────────── */
  const handleSaveDraft = React.useCallback(async () => {
    try {
      await saveDraft.mutateAsync({
        id: proposalId,
        welcomeMessage,
        scopeContent,
        selectedTier,
        addOns,
        customTiers,
        enabledClauses,
        extraClauses,
        depositPercent,
        milestones: milestonesCount,
        automations: automations.map((a) => ({ id: a.id, enabled: a.enabled })),
        reminderEnabled,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        videoUrl,
        acceptedPaymentMethods,
      });
      setSavedAt(
        new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      );
    } catch (err) {
      console.error("[save draft]", err);
    }
  }, [
    proposalId, welcomeMessage, scopeContent, selectedTier, addOns, customTiers,
    enabledClauses, extraClauses, depositPercent, milestonesCount, automations,
    reminderEnabled, expiresAt, videoUrl, acceptedPaymentMethods, saveDraft,
  ]);

  /* ── Send ───────────────────────────────────────────── */
  const handleConfirmSend = React.useCallback(async () => {
    try {
      await updateStatus.mutateAsync({ id: proposalId, status: "sent" });
      setSendConfirmOpen(false);
    } catch (err) {
      console.error("[send proposal]", err);
    }
  }, [proposalId, updateStatus]);

  /* ── Pricing ────────────────────────────────────────── */
  const selectedTierPrice = selectedTier ? (tierPrices[selectedTier] ?? 0) : 0;
  const customTierTotal = customTiers
    .filter((t) => t.id === selectedTier)
    .reduce((s, t) => s + t.price, 0);
  const baseTierPrice = selectedTierPrice || customTierTotal;
  const addOnsTotal = addOns.filter((a) => a.enabled).reduce((s, a) => s + a.price, 0);
  const subtotal = baseTierPrice + addOnsTotal;
  const deposit = Math.round(subtotal * (depositPercent / 100));
  const balance = subtotal - deposit;

  const toggleAddOn = (id: string) =>
    setAddOns((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  const toggleClause = (id: string) =>
    setEnabledClauses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  const toggleAutomation = (id: string) =>
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );

  /* ── Loading / Error ────────────────────────────────── */
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

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
        <div className="flex flex-col min-w-0 flex-1 w-full">
          <Link
            href="/proposals"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Proposals
          </Link>

          <div className="flex items-center gap-2 min-w-0 mb-1">
            <H1 className="text-2xl font-medium truncate min-w-0">{proposal.title}</H1>
            <Badge
              variant="outline"
              className={cn("flex-shrink-0 bg-transparent", statusConfig[proposalStatus]?.className)}
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
            <span className="whitespace-nowrap">Created {proposal.createdAt}</span>
            {savedAt && (
              <>
                <span className="flex-shrink-0 text-zinc-300">•</span>
                <span className="whitespace-nowrap text-zinc-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Saved {savedAt}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none h-9" onClick={handlePreview}>
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
            disabled={proposalStatus === "signed" || proposalStatus === "expired"}
          >
            <Send className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {proposalStatus === "sent" || proposalStatus === "viewed" ? "Resend" : "Send to Client"}
            </span>
            <span className="inline sm:hidden">Send</span>
          </Button>
        </div>
      </div>

      {/* ── Export error banner ─────────────────── */}
      {exportError && (
        <div className="flex items-start gap-3 p-3 rounded-md border border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-700">PDF generation failed</p>
            <p className="text-xs text-red-600 mt-0.5">{exportError}</p>
          </div>
          <button
            onClick={() => setExportError(null)}
            className="text-red-400 hover:text-red-600 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── 3-column grid ───────────────────────── */}
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
                    isActive ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {i + 1}
                </div>
                <span>{section.label}</span>
                <Icon
                  className={cn("h-4 w-4 ml-auto", isActive ? "text-zinc-900" : "text-zinc-400")}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}

          {/* Live total */}
          {subtotal > 0 && (
            <Surface className="p-4 mt-4 space-y-2">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">
                Proposal Total
              </Muted>
              <Separator />
              <div className="space-y-1.5">
                {selectedTier && (
                  <div className="flex justify-between text-xs text-zinc-600 gap-2">
                    <span className="capitalize truncate min-w-0">{selectedTier} Package</span>
                    <span className="shrink-0">${baseTierPrice.toLocaleString()}</span>
                  </div>
                )}
                {addOns.filter((a) => a.enabled).map((a) => (
                  <div key={a.id} className="flex justify-between text-xs text-zinc-600 gap-2">
                    <span className="truncate min-w-0">{a.label}</span>
                    <span className="shrink-0">+${a.price.toLocaleString()}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm font-bold text-zinc-900 gap-2">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 gap-2">
                  <span>Deposit ({depositPercent}%)</span>
                  <span>${deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 gap-2">
                  <span>Balance Due</span>
                  <span>${balance.toLocaleString()}</span>
                </div>
              </div>
            </Surface>
          )}
        </div>

        {/* ══ CENTER: Section Content ══════════ */}
        <div className="space-y-6">

          {/* ── 1. Welcome ──────────────────── */}
          {activeSection === "welcome" && (
            <>
              <Surface className="p-0 overflow-hidden">
                {/* Hero image */}
                <div className="h-48 bg-zinc-100 flex items-center justify-center border-b border-zinc-200 border-dashed cursor-pointer hover:bg-zinc-50 transition-colors">
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
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-zinc-700 uppercase tracking-widest">
                      Welcome Message
                    </label>
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Write a personalized welcome message for your client…"
                      rows={5}
                      className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 transition-colors"
                    />
                  </div>
                </div>
              </Surface>

              {/* Video embed */}
              <Surface className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                  <H3 className="text-sm">Welcome Video</H3>
                </div>
                {embedUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-md overflow-hidden border border-zinc-200 bg-zinc-100">
                      <iframe
                        src={embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full aspect-video"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={videoInput}
                        onChange={(e) => setVideoInput(e.target.value)}
                        className="flex-1 h-8 text-xs"
                        placeholder="Paste a different URL…"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleApplyVideoUrl}
                      >
                        Update
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-zinc-400"
                        onClick={() => { setVideoUrl(""); setVideoInput(""); }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-32 rounded-md border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <Video className="h-6 w-6" strokeWidth={1.5} />
                        <span className="text-xs">YouTube or Loom URL</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={videoInput}
                        onChange={(e) => setVideoInput(e.target.value)}
                        placeholder="https://www.loom.com/share/... or youtube.com/watch?v=..."
                        className="flex-1 h-9 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") handleApplyVideoUrl(); }}
                      />
                      <Button
                        variant="outline"
                        className="h-9 shrink-0"
                        onClick={handleApplyVideoUrl}
                        disabled={!videoInput.trim()}
                      >
                        Embed
                      </Button>
                    </div>
                  </div>
                )}
              </Surface>

              {/* Smart Fields preview */}
              <Surface className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                  <H3 className="text-sm">Smart Fields</H3>
                  <Badge variant="outline" className="text-[10px] ml-auto">Auto-populated</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { token: "{{client.name}}", value: proposal.client },
                    { token: "{{client.email}}", value: proposal.clientEmail ?? "—" },
                    { token: "{{project.startDate}}", value: "Set after signing" },
                    { token: "{{project.endDate}}", value: "Set after signing" },
                  ].map((field) => (
                    <div
                      key={field.token}
                      className="rounded-md border border-zinc-200 bg-zinc-50 p-3 min-w-0"
                    >
                      <Muted className="text-[10px] font-mono truncate">{field.token}</Muted>
                      <div className="text-sm font-medium text-zinc-900 mt-0.5 truncate">
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </>
          )}

          {/* ── 2. Scope ────────────────────── */}
          {activeSection === "scope" && (
            <Surface className="p-8 space-y-6">
              <div className="space-y-2">
                <H2 className="text-2xl tracking-tight">Project Scope & Deliverables</H2>
                <Muted>
                  Detail your deliverables, timelines, and milestones. Smart Fields like{" "}
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

          {/* ── 3. Packages ─────────────────── */}
          {activeSection === "packages" && (
            <>
              <Surface className="p-8 space-y-8">
                <div className="space-y-1">
                  <H2 className="text-2xl tracking-tight">Service Packages</H2>
                  <Muted>Select a tier. The total updates dynamically.</Muted>
                </div>

                {/* Standard tiers */}
                <div className="flex flex-col gap-3">
                  <PricingTierCard
                    title="Foundation"
                    price="$2,500"
                    description="Core setup and essential features."
                    features={["5 Core Landing Pages", "Contact Integration", "Basic SEO Setup", "2 Revision Rounds"]}
                    isSelected={selectedTier === "foundation"}
                    onSelect={() => setSelectedTier(selectedTier === "foundation" ? null : "foundation")}
                  />
                  <PricingTierCard
                    title="Scale"
                    price="$5,500"
                    description="Advanced features for growing teams."
                    features={["Everything in Foundation", "E-Commerce Setup", "Analytics Dashboard", "Priority Support"]}
                    isSelected={selectedTier === "scale"}
                    onSelect={() => setSelectedTier(selectedTier === "scale" ? null : "scale")}
                  />
                  <PricingTierCard
                    title="Enterprise"
                    price="$9,500"
                    description="Full-service for established brands."
                    features={["Everything in Scale", "Custom Integrations", "Dedicated Account Manager", "Unlimited Revisions"]}
                    isSelected={selectedTier === "enterprise"}
                    onSelect={() => setSelectedTier(selectedTier === "enterprise" ? null : "enterprise")}
                  />
                </div>

                {/* Custom tiers */}
                {customTiers.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {customTiers.map((tier) => (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(selectedTier === tier.id ? null : tier.id)}
                        className={cn(
                          "group flex items-start gap-4 p-5 rounded-lg border bg-white cursor-pointer transition-all duration-200",
                          selectedTier === tier.id
                            ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50/50"
                            : "border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        {/* Radio indicator */}
                        <div className="mt-0.5 shrink-0">
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                              selectedTier === tier.id ? "border-zinc-900" : "border-zinc-300 group-hover:border-zinc-400"
                            )}
                          >
                            {selectedTier === tier.id && (
                              <div className="h-2 w-2 rounded-full bg-zinc-900" />
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3 flex-wrap">
                            <span className="font-semibold text-zinc-900 text-sm">{tier.title}</span>
                            <span className="text-lg font-bold text-zinc-900 shrink-0">
                              ${tier.price.toLocaleString()}
                            </span>
                          </div>
                          {tier.description && (
                            <p className="text-xs text-zinc-500 mt-1 mb-2">{tier.description}</p>
                          )}
                          {tier.features.length > 0 && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {tier.features.map((f) => (
                                <span key={f} className="flex items-center gap-1.5 text-xs text-zinc-600">
                                  <Check className="h-3 w-3 text-zinc-400 shrink-0" strokeWidth={2.5} />
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 self-center flex items-center gap-2">
                          <button
                            className="text-zinc-300 hover:text-zinc-600 transition-colors p-1"
                            onClick={(e) => { e.stopPropagation(); handleRemoveCustomTier(tier.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setCustomTierOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Tier
                </Button>
              </Surface>

              {/* Add-ons */}
              <Surface className="p-8 space-y-6">
                <div className="space-y-1">
                  <H3>Optional Add-ons</H3>
                  <Muted className="text-xs">Clients can toggle these to customize their package.</Muted>
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
                            "h-5 w-5 rounded border flex items-center justify-center flex-shrink-0",
                            addon.enabled ? "bg-zinc-900 border-zinc-900" : "border-zinc-300"
                          )}
                        >
                          {addon.enabled && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-medium text-zinc-900 truncate">
                          {addon.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 shrink-0">
                        +${addon.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Surface>

              {/* Mobile total */}
              <Surface className="p-6 space-y-3 lg:hidden">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">
                  Proposal Total
                </Muted>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-zinc-900 gap-2">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500 gap-2">
                  <span>Deposit ({depositPercent}%)</span>
                  <span>${deposit.toLocaleString()}</span>
                </div>
              </Surface>
            </>
          )}

          {/* ── 4. Agreement ─────────────────── */}
          {activeSection === "agreement" && (
            <>
              <Surface className="p-8 space-y-6">
                <div className="space-y-1">
                  <H2 className="text-2xl tracking-tight">Legal Agreement</H2>
                  <Muted>
                    Select a base template, then toggle clauses on or off as needed.
                  </Muted>
                </div>

                {/* Template picker */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">
                    Selected Template
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {contractTemplates.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-md border cursor-pointer transition-all",
                          selectedTemplateId === t.id
                            ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50"
                            : "border-zinc-200 hover:border-zinc-300 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 rounded-sm bg-white border border-zinc-200 shadow-sm flex items-center justify-center flex-shrink-0">
                            {t.type === "standard" ? (
                              <Shield className="h-3 w-3 text-zinc-700" />
                            ) : (
                              <FileText className="h-3 w-3 text-zinc-500" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-zinc-900 truncate">
                            {t.name}
                          </span>
                        </div>
                        {selectedTemplateId === t.id && (
                          <Check className="h-4 w-4 text-zinc-900 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* AI suggestions */}
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
                      {AI_SUGGESTED_CLAUSES.map((suggestion) => {
                        const alreadyAdded = extraClauses.some(
                          (c) => c.title === suggestion.title
                        );
                        return (
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
                              {alreadyAdded ? (
                                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Added
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px]"
                                  onClick={() => handleAddSuggestedClause(suggestion)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Surface>
                )}

                {/* Standard clauses */}
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
                            <Lock className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                            <span className="text-sm font-semibold text-zinc-900 truncate">
                              {clause.title}
                            </span>
                            <Badge variant="outline" className="text-[9px] border-zinc-300 text-zinc-500">
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
                            <p className="text-xs text-zinc-600 leading-relaxed">{clause.body}</p>
                            <Muted className="text-[9px] mt-2 flex items-center gap-1">
                              <Shield className="h-2.5 w-2.5" />
                              {clause.category} · Cannot be edited
                            </Muted>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Added AI clauses */}
                  {extraClauses.map((clause) => (
                    <div key={clause.title} className="rounded-md border border-zinc-200 bg-zinc-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="text-sm font-semibold text-zinc-900 truncate">
                            {clause.title}
                          </span>
                          <Badge variant="outline" className="text-[9px] border-zinc-300 text-zinc-500">
                            AI Added
                          </Badge>
                        </div>
                        <button
                          onClick={() => handleRemoveExtraClause(clause.title)}
                          className="text-zinc-300 hover:text-zinc-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-xs text-zinc-600 leading-relaxed">{clause.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>

              {/* Signatures */}
              <Surface className="p-8 space-y-6">
                <H3>E-Signatures</H3>
                <P className="text-sm text-zinc-500 italic">
                  This document is cryptographically hashed (SHA-256) once signed. IP address and
                  UTC timestamp are recorded.
                </P>
                <div className="flex flex-wrap gap-8 pt-2">
                  <SignatureBlock label="Freelancer Signature" />
                  <SignatureBlock label="Client Signature" className="opacity-50 pointer-events-none" />
                </div>
              </Surface>
            </>
          )}

          {/* ── 5. Payment ─────────────────── */}
          {activeSection === "payment" && (
            <>
              <Surface className="p-8 space-y-6">
                <div className="space-y-1">
                  <H2 className="text-2xl tracking-tight">Payment & Escrow</H2>
                  <Muted>
                    Configure the deposit and milestone payment structure. Funds are held securely
                    via Stripe Connect.
                  </Muted>
                </div>
                <Separator />

                {/* Deposit slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold">
                      Deposit Percentage
                    </Muted>
                    <span className="text-sm font-semibold text-zinc-900">{depositPercent}%</span>
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
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>10%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Milestone counter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold">
                      Number of Milestones
                    </Muted>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMilestonesCount((n) => Math.max(1, n - 1))}
                        className="h-7 w-7 rounded border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        –
                      </button>
                      <span className="text-sm font-semibold text-zinc-900 w-4 text-center">
                        {milestonesCount}
                      </span>
                      <button
                        onClick={() => setMilestonesCount((n) => Math.min(10, n + 1))}
                        className="h-7 w-7 rounded border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Visualizer */}
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-zinc-900 transition-all"
                      style={{ width: `${depositPercent}%` }}
                    />
                    {milestonesCount > 1 &&
                      Array.from({ length: milestonesCount - 1 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn("transition-all", i % 2 === 0 ? "bg-zinc-400" : "bg-zinc-300")}
                          style={{ width: `${(100 - depositPercent) / (milestonesCount - 1)}%` }}
                        />
                      ))}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Deposit ({depositPercent}%)</span>
                    <span>
                      {milestonesCount - 1} Milestone{milestonesCount - 1 !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <Surface className="p-4 space-y-2 bg-zinc-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-semibold text-zinc-900">
                      {subtotal > 0 ? `$${subtotal.toLocaleString()}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Deposit Due ({depositPercent}%)</span>
                    <span className="font-bold text-zinc-900">
                      {deposit > 0 ? `$${deposit.toLocaleString()}` : "—"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Balance (on milestones)</span>
                    <span className="text-zinc-700">
                      {balance > 0 ? `$${balance.toLocaleString()}` : "—"}
                    </span>
                  </div>
                </Surface>

                {subtotal === 0 && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Select a package in the Packages section to calculate totals.
                  </div>
                )}
              </Surface>

              {/* Payment Methods */}
              <Surface className="p-8 space-y-6">
                <div className="space-y-1">
                  <H3>Payment Methods</H3>
                  <Muted className="text-xs">
                    Select which methods your client can use to pay. Toggle multiple options on.
                  </Muted>
                </div>

                {paymentMethods.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center space-y-3">
                    <Wallet className="h-8 w-8 text-zinc-300 mx-auto" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-zinc-700">No payment methods connected</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Connect a payout method in your Finance settings first.
                      </p>
                    </div>
                    <Link href="/finance">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                        Go to Finance Settings
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentMethods.map((method) => {
                      const enabled = acceptedPaymentMethods.includes(method.id);
                      const meta = RAIL_META[method.rail];
                      const toggle = () =>
                        setAcceptedPaymentMethods((prev) =>
                          enabled ? prev.filter((id) => id !== method.id) : [...prev, method.id]
                        );
                      return (
                        <div
                          key={method.id}
                          role="button"
                          tabIndex={0}
                          onClick={toggle}
                          onKeyDown={(e) => e.key === "Enter" && toggle()}
                          className={cn(
                            "group flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200",
                            enabled
                              ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50/50"
                              : "border-zinc-200 hover:border-zinc-300 bg-white"
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                              enabled ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 group-hover:border-zinc-400"
                            )}
                          >
                            {enabled && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </div>

                          {/* Icon */}
                          <span className="text-xl shrink-0" aria-hidden="true">
                            {meta.icon}
                          </span>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900">
                                {method.label}
                              </span>
                              {method.isDefault && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 border border-zinc-200 px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {method.accountName && (
                                <span className="text-xs text-zinc-500">{method.accountName}</span>
                              )}
                              {method.lastFour && (
                                <span className="text-xs text-zinc-400">····{method.lastFour}</span>
                              )}
                              <span className="text-xs text-zinc-400">·</span>
                              <span className="text-xs text-zinc-400">{method.currency}</span>
                              {method.supportsInstant && (
                                <>
                                  <span className="text-xs text-zinc-400">·</span>
                                  <span className="text-xs text-emerald-600 font-medium">Instant</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Processing time */}
                          <span className="text-xs text-zinc-400 shrink-0 hidden sm:block">
                            {method.processingTime}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {acceptedPaymentMethods.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-zinc-50 border border-zinc-200">
                    <Shield className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-xs text-zinc-500">
                      Clients will see{" "}
                      <span className="font-medium text-zinc-700">
                        {acceptedPaymentMethods.length} payment option{acceptedPaymentMethods.length > 1 ? "s" : ""}
                      </span>{" "}
                      on their proposal. Funds are escrowed until milestone approval.
                    </p>
                  </div>
                )}
              </Surface>
            </>
          )}
        </div>

        {/* ══ RIGHT: Settings Sidebar ══════════ */}
        <div className="space-y-4">

          {/* Share link */}
          <Surface className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
              <Muted className="text-[10px] uppercase tracking-widest font-bold">
                Client Link
              </Muted>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Share this link for the client to review and sign.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 h-8 rounded-md border border-zinc-200 bg-zinc-50 px-2 flex items-center overflow-hidden">
                <span className="text-[10px] text-zinc-400 truncate font-mono">
                  /p/{proposalId.slice(0, 8)}…
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-zinc-700" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </Surface>

          {/* Proposal Details */}
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

          {/* Expiration */}
          <Surface className="p-5 space-y-4">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Expiration</Muted>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  Expires On
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full h-8 pl-8 pr-2 rounded-md border border-zinc-200 bg-white text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                {expiresAt && (
                  <button
                    className="text-[10px] text-zinc-400 hover:text-zinc-600"
                    onClick={() => setExpiresAt("")}
                  >
                    Clear expiration
                  </button>
                )}
              </div>
              <div
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-700">Auto-remind 3 days before</span>
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
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Analytics</Muted>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Eye className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  Total Views
                </div>
                <span className="text-sm font-semibold text-zinc-900">{proposal.viewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  Avg. Time Spent
                </div>
                <span className="text-sm font-medium text-zinc-700">{proposal.avgTimeSpent}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  Last Viewed
                </div>
                <span className="text-sm text-zinc-700">{proposal.viewedAt || "—"}</span>
              </div>
            </div>
          </Surface>

          {/* On Acceptance automations */}
          <Surface className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
              <Muted className="text-[10px] uppercase tracking-widest font-bold">On Acceptance</Muted>
            </div>
            <Muted className="text-[10px] leading-relaxed">
              These actions trigger automatically when the client signs and pays.
            </Muted>
            <div className="space-y-2">
              {automations.map((auto) => {
                const Icon = auto.icon;
                return (
                  <div
                    key={auto.id}
                    onClick={() => toggleAutomation(auto.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                      <div>
                        <span className="text-xs font-medium text-zinc-900 block">{auto.label}</span>
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

          {/* Version history */}
          <Surface className="p-5 space-y-4">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Version History</Muted>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-zinc-900">v1</span>
                  <Badge variant="outline" className="text-[9px]">Current</Badge>
                </div>
                <Muted className="text-[10px]">{proposal.createdAt}</Muted>
              </div>
            </div>
          </Surface>
        </div>
      </div>

      {/* ── Add Custom Tier Modal ─────────── */}
      {customTierOpen && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-zinc-900/30"
            onClick={() => setCustomTierOpen(false)}
          />
          <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <H3 className="text-base">Add Custom Tier</H3>
              <button
                onClick={() => setCustomTierOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Tier Name</label>
                <Input
                  value={newTierTitle}
                  onChange={(e) => setNewTierTitle(e.target.value)}
                  placeholder="e.g., Custom Solution"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Price (USD)</label>
                <Input
                  type="number"
                  value={newTierPrice}
                  onChange={(e) => setNewTierPrice(e.target.value)}
                  placeholder="e.g., 7500"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Description</label>
                <Input
                  value={newTierDesc}
                  onChange={(e) => setNewTierDesc(e.target.value)}
                  placeholder="Short description of this tier"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Features{" "}
                  <span className="text-zinc-400 font-normal">(one per line)</span>
                </label>
                <textarea
                  value={newTierFeatures}
                  onChange={(e) => setNewTierFeatures(e.target.value)}
                  rows={4}
                  placeholder={"Custom integration\nDedicated support\n..."}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCustomTierOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!newTierTitle.trim() || !newTierPrice}
                onClick={handleAddCustomTier}
              >
                Add Tier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Confirmation Modal ──────────── */}
      {sendConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
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
                  This will mark the proposal as sent.{" "}
                  {proposal.clientEmail ? (
                    <>Client email: <strong>{proposal.clientEmail}</strong>.</>
                  ) : (
                    <>No client email on file — share the client link manually.</>
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
