"use client";

import * as React from "react";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PricingTierCard } from "@/components/ui/pricing-tier";
import { SignatureBlock } from "@/components/ui/signature-block";
import { MinimalEditor } from "@/components/editor/editor";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  ChevronRight,
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
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "expired";

interface ProposalDetail {
  id: string;
  title: string;
  client: string;
  clientId: string;
  clientEmail: string;
  status: ProposalStatus;
  value: number;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  viewCount: number;
  avgTimeSpent: string;
  template: string;
  depositPercent: number;
  milestones: number;
  welcomeMessage: string;
  scopeContent: string;
}

interface AddOn {
  id: string;
  label: string;
  price: number;
  enabled: boolean;
}

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
   MOCK DATA
   ═══════════════════════════════════════════════════════ */

const proposalDatabase: Record<string, ProposalDetail> = {
  "1": {
    id: "1",
    title: "Website Overhaul — Full Redesign",
    client: "Acme Corp",
    clientId: "1",
    clientEmail: "david@acmecorp.com",
    status: "signed",
    value: 12500,
    createdAt: "Feb 28, 2026",
    sentAt: "Mar 01, 2026",
    viewedAt: "Mar 01, 2026",
    signedAt: "Mar 03, 2026",
    expiresAt: null,
    viewCount: 8,
    avgTimeSpent: "4m 32s",
    template: "Website Project",
    depositPercent: 50,
    milestones: 3,
    welcomeMessage:
      "Hi David, thank you for choosing Velluma for your website overhaul. We're excited to partner with Acme Corp on this transformation.",
    scopeContent: "",
  },
  "2": {
    id: "2",
    title: "Brand Identity Package",
    client: "Vesper AI",
    clientId: "3",
    clientEmail: "lena@vesperai.com",
    status: "viewed",
    value: 8500,
    createdAt: "Mar 05, 2026",
    sentAt: "Mar 06, 2026",
    viewedAt: "Mar 10, 2026",
    signedAt: null,
    expiresAt: "Mar 20, 2026",
    viewCount: 4,
    avgTimeSpent: "2m 15s",
    template: "Brand Package",
    depositPercent: 40,
    milestones: 2,
    welcomeMessage:
      "Hi Lena, we've prepared a comprehensive brand identity package designed to position Vesper AI as a market leader.",
    scopeContent: "",
  },
  "3": {
    id: "3",
    title: "E-Commerce Platform Build",
    client: "Terra Finance",
    clientId: "2",
    clientEmail: "sarah@terrafinance.com",
    status: "sent",
    value: 22000,
    createdAt: "Mar 08, 2026",
    sentAt: "Mar 09, 2026",
    viewedAt: null,
    signedAt: null,
    expiresAt: "Mar 23, 2026",
    viewCount: 0,
    avgTimeSpent: "—",
    template: "Website Project",
    depositPercent: 50,
    milestones: 4,
    welcomeMessage:
      "Hi Sarah, this proposal outlines our approach to building a best-in-class e-commerce platform for Terra Finance.",
    scopeContent: "",
  },
  "4": {
    id: "4",
    title: "Mobile App MVP — Phase 1",
    client: "Orbit Systems",
    clientId: "4",
    clientEmail: "james@orbitsystems.io",
    status: "draft",
    value: 18000,
    createdAt: "Mar 10, 2026",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    expiresAt: null,
    viewCount: 0,
    avgTimeSpent: "—",
    template: "Blank",
    depositPercent: 50,
    milestones: 3,
    welcomeMessage:
      "Hi James, this proposal details our plan for the Orbit Systems mobile app MVP.",
    scopeContent: "",
  },
};

const defaultAddOns: AddOn[] = [
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

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function ProposalBuilderPage() {
  const params = useParams();
  const proposalId = params.id as string;
  const proposal = proposalDatabase[proposalId] || proposalDatabase["1"];

  const [activeSection, setActiveSection] = React.useState<SectionKey>("welcome");
  const [selectedTier, setSelectedTier] = React.useState<string | null>(null);
  const [addOns, setAddOns] = React.useState<AddOn[]>(defaultAddOns);
  const [enabledClauses, setEnabledClauses] = React.useState<string[]>(
    legalClauses.map((c) => c.id)
  );
  const [aiSuggestions, setAiSuggestions] = React.useState<boolean>(false);
  const [automations, setAutomations] = React.useState<Automation[]>([
    { id: "project", label: "Create Project", description: "Auto-create a project in the Kanban board", enabled: true, icon: Briefcase },
    { id: "template", label: "Apply Task Template", description: "Pre-populate tasks from template", enabled: true, icon: LayoutTemplate },
    { id: "email", label: "Send Welcome Email", description: "Trigger onboarding email to client", enabled: true, icon: Mail },
    { id: "invoice", label: "Generate First Invoice", description: "Create deposit invoice automatically", enabled: false, icon: Receipt },
  ]);
  const [reminderEnabled, setReminderEnabled] = React.useState(true);

  /* ── Pricing Calculations ─────────────────── */
  const tierPrices: Record<string, number> = {
    foundation: 2500,
    scale: 5500,
    enterprise: 9500,
  };

  const selectedTierPrice = selectedTier ? tierPrices[selectedTier] || 0 : 0;
  const addOnsTotal = addOns.filter((a) => a.enabled).reduce((s, a) => s + a.price, 0);
  const subtotal = selectedTierPrice + addOnsTotal;
  const deposit = Math.round(subtotal * (proposal.depositPercent / 100));
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

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/proposals"
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Proposals
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <div className="flex items-center gap-3">
              <H1 className="text-xl">{proposal.title}</H1>
              <Badge
                variant="outline"
                className={cn("bg-transparent", statusConfig[proposal.status].className)}
              >
                {statusConfig[proposal.status].label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Link
                href={`/clients/${proposal.clientId}`}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <Building className="h-3 w-3" />
                {proposal.client}
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
              <span className="text-zinc-300">·</span>
              <Muted className="text-xs">Created {proposal.createdAt}</Muted>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Preview
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Save Draft
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Send to Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-6">
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
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span className="capitalize">{selectedTier} Package</span>
                    <span>${selectedTierPrice.toLocaleString()}</span>
                  </div>
                )}
                {addOns
                  .filter((a) => a.enabled)
                  .map((a) => (
                    <div key={a.id} className="flex justify-between text-xs text-zinc-600">
                      <span>{a.label}</span>
                      <span>+${a.price.toLocaleString()}</span>
                    </div>
                  ))}
                <Separator />
                <div className="flex justify-between text-sm font-bold text-zinc-900">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Deposit ({proposal.depositPercent}%)</span>
                  <span>${deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Balance Due</span>
                  <span>${balance.toLocaleString()}</span>
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
              {/* Hero image placeholder */}
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
                    <H2 className="text-3xl font-bold tracking-tight">
                      {proposal.title}
                    </H2>
                    <Muted>{proposal.client}</Muted>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <label className="text-xs font-medium text-zinc-700 uppercase tracking-widest">
                      Welcome Message
                    </label>
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 leading-relaxed">
                      <P>{proposal.welcomeMessage}</P>
                    </div>
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
                    <span className="text-xs">Paste a YouTube or Loom URL</span>
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
                  <Sparkles className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                  <H3 className="text-sm">Smart Fields</H3>
                  <Badge variant="outline" className="text-[10px] ml-auto">Auto-populated</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { token: "{{client.name}}", value: proposal.client },
                    { token: "{{client.email}}", value: proposal.clientEmail },
                    { token: "{{project.startDate}}", value: "Mar 15, 2026" },
                    { token: "{{project.endDate}}", value: "May 30, 2026" },
                  ].map((field) => (
                    <div key={field.token} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <Muted className="text-[10px] font-mono">{field.token}</Muted>
                      <div className="text-sm font-medium text-zinc-900 mt-0.5">
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
                <H2 className="text-2xl tracking-tight">Project Scope & Deliverables</H2>
                <Muted>
                  Detail your deliverables, timelines, and milestones. Smart Fields
                  like{" "}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] font-mono text-zinc-600">
                    <Sparkles className="h-2.5 w-2.5" />
                    {"{{client.name}}"}
                  </span>{" "}
                  will auto-populate for the client.
                </Muted>
              </div>
              <Separator />
              <MinimalEditor
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
                    onSelect={() => setSelectedTier("foundation")}
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
                    onSelect={() => setSelectedTier("scale")}
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
                    onSelect={() => setSelectedTier("enterprise")}
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
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center",
                            addon.enabled
                              ? "bg-zinc-900 border-zinc-900"
                              : "border-zinc-300"
                          )}
                        >
                          {addon.enabled && (
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          )}
                        </div>
                        <span className="text-sm font-medium text-zinc-900">
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
                <div className="flex justify-between text-lg font-bold text-zinc-900">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Deposit ({proposal.depositPercent}%)</span>
                  <span>${deposit.toLocaleString()}</span>
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
                    Legally-vetted clauses are locked. Toggle clauses on or off, but
                    individual text cannot be edited.
                  </Muted>
                </div>
                <Separator />

                {/* AI suggestion button */}
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

                {/* AI suggestions */}
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
                            <Button variant="outline" size="sm" className="h-7 text-[10px]">
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <X className="h-3 w-3 text-zinc-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Surface>
                )}

                {/* Locked Clause Blocks */}
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
                          <div className="flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                            <span className="text-sm font-semibold text-zinc-900">
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

              {/* Signature Blocks */}
              <Surface className="p-8 space-y-6">
                <H3>E-Signatures</H3>
                <P className="text-sm text-zinc-500 italic">
                  This document is cryptographically hashed (SHA-256) once signed.
                  IP address and UTC timestamp are recorded.
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
                  <H2 className="text-2xl tracking-tight">Payment & Escrow</H2>
                  <Muted>
                    Configure the deposit and milestone payment structure. Funds are
                    held securely via Stripe Connect.
                  </Muted>
                </div>
                <Separator />

                {/* Escrow Split Visualizer */}
                <div className="space-y-3">
                  <Muted className="text-[10px] uppercase tracking-widest font-bold">
                    Payment Structure
                  </Muted>
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-zinc-900 rounded-l-full transition-all"
                      style={{ width: `${proposal.depositPercent}%` }}
                    />
                    {Array.from({ length: proposal.milestones - 1 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "transition-all",
                          i % 2 === 0 ? "bg-zinc-400" : "bg-zinc-300"
                        )}
                        style={{
                          width: `${(100 - proposal.depositPercent) / (proposal.milestones - 1)}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Deposit ({proposal.depositPercent}%)</span>
                    <span>
                      {proposal.milestones - 1} Milestone
                      {proposal.milestones - 1 > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Payment Summary */}
                <Surface className="p-4 space-y-2 bg-zinc-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-semibold text-zinc-900">
                      ${subtotal > 0 ? subtotal.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">
                      Deposit Due ({proposal.depositPercent}%)
                    </span>
                    <span className="font-bold text-zinc-900">
                      ${deposit > 0 ? deposit.toLocaleString() : "—"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Balance (on milestones)</span>
                    <span className="text-zinc-700">
                      ${balance > 0 ? balance.toLocaleString() : "—"}
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
                      Encrypted via Stripe · PCI-DSS Compliant · Funds escrowed
                      until milestone approval
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
                  {proposal.depositPercent}% Deposit · {proposal.milestones} Milestones
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
              These actions trigger automatically when the client signs and pays.
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
                      <Icon className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
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
              {[
                { version: "v3", date: "Mar 14, 10:30 AM", label: "Current" },
                { version: "v2", date: "Mar 12, 4:15 PM", label: null },
                { version: "v1", date: "Mar 10, 9:00 AM", label: "Initial" },
              ].map((v) => (
                <div
                  key={v.version}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-zinc-900">
                      {v.version}
                    </span>
                    {v.label && (
                      <Badge variant="outline" className="text-[9px]">
                        {v.label}
                      </Badge>
                    )}
                  </div>
                  <Muted className="text-[10px]">{v.date}</Muted>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
