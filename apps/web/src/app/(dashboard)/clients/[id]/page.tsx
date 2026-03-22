"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useClient } from "@/lib/queries/clients";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Twitter,
  Briefcase,
  DollarSign,
  Heart,
  FileText,
  MessageSquare,
  Clock,
  User,
  Bot,
  Send,
  Calendar,
  Plus,
  X,
  PenLine,
  Tag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield,
  Eye,
  UserPlus,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

interface TimelineEvent {
  action: string;
  time: string;
  type: "email" | "call" | "payment" | "contract" | "document" | "note" | "system" | "automation";
}

interface Invoice {
  id: string;
  number: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
  date: string;
  project: string;
}

interface Document {
  id: string;
  name: string;
  type: "proposal" | "contract" | "invoice" | "file";
  status: string;
  date: string;
}

interface SecondaryContact {
  name: string;
  role: string;
  email: string;
  portalAccess: boolean;
}

interface CustomField {
  label: string;
  value: string;
  type: "text" | "date" | "dropdown";
}

interface ProjectRecord {
  name: string;
  status: "Active" | "Completed" | "On Hold";
  value: string;
  progress: number;
}

interface ClientDetail {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  status: "active" | "lead" | "past";
  healthScore: number;
  totalRevenue: number;
  revenueDisplay: string;
  activeProjects: number;
  completedProjects: number;
  tags: string[];
  source: string;
  createdAt: string;
  enrichment: {
    linkedin: string;
    twitter: string;
    companySize: string;
    industry: string;
    confidence: number;
  };
  secondaryContacts: SecondaryContact[];
  customFields: CustomField[];
  projects: ProjectRecord[];
  invoices: Invoice[];
  documents: Document[];
  timeline: TimelineEvent[];
  notes: string[];
}

/* ═══════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════ */

const clientDatabase: Record<string, ClientDetail> = {
  "1": {
    id: "1", name: "David Frost", company: "Acme Corp", email: "david@acme.co", phone: "+1 (415) 555-0199", website: "acme.co",
    status: "active", healthScore: 92, totalRevenue: 42500, revenueDisplay: "$42,500", activeProjects: 1, completedProjects: 2,
    tags: ["Enterprise", "VIP", "E-commerce"], source: "Returning Client", createdAt: "Jan 15, 2025",
    enrichment: { linkedin: "linkedin.com/in/davidfrost", twitter: "@davidfrost_ceo", companySize: "200-1000", industry: "E-commerce", confidence: 99 },
    secondaryContacts: [
      { name: "Rachel Frost", role: "CFO / Business Partner", email: "rachel@acme.co", portalAccess: true },
      { name: "Mike Torres", role: "Project Lead", email: "mike@acme.co", portalAccess: false },
    ],
    customFields: [
      { label: "Preferred Contact Method", value: "Email", type: "dropdown" },
      { label: "Timezone", value: "PST (UTC-8)", type: "text" },
      { label: "Contract Renewal", value: "Jun 15, 2026", type: "date" },
      { label: "NDA Signed", value: "Yes — Jan 20, 2025", type: "text" },
    ],
    projects: [
      { name: "E-commerce Redesign", status: "Active", value: "$18,500", progress: 65 },
      { name: "Brand Identity Guide", status: "Completed", value: "$12,000", progress: 100 },
      { name: "Marketing Landing Page", status: "Completed", value: "$12,000", progress: 100 },
    ],
    invoices: [
      { id: "i1", number: "INV-0042", amount: "$5,500", status: "paid", date: "Mar 10", project: "E-commerce Redesign" },
      { id: "i2", number: "INV-0043", amount: "$6,500", status: "pending", date: "Mar 25", project: "E-commerce Redesign" },
      { id: "i3", number: "INV-0038", amount: "$12,000", status: "paid", date: "Feb 01", project: "Brand Identity Guide" },
      { id: "i4", number: "INV-0029", amount: "$12,000", status: "paid", date: "Dec 15", project: "Marketing Landing Page" },
      { id: "i5", number: "INV-0044", amount: "$6,500", status: "overdue", date: "Mar 01", project: "E-commerce Redesign" },
    ],
    documents: [
      { id: "d1", name: "E-commerce Redesign Proposal", type: "proposal", status: "Signed", date: "Feb 15" },
      { id: "d2", name: "Master Services Agreement", type: "contract", status: "Active", date: "Jan 20" },
      { id: "d3", name: "Brand Guidelines PDF", type: "file", status: "Delivered", date: "Feb 28" },
      { id: "d4", name: "NDA — Mutual", type: "contract", status: "Signed", date: "Jan 20" },
    ],
    timeline: [
      { action: "Signed contract for E-commerce Redesign", time: "4h ago", type: "contract" },
      { action: "Invoice INV-0042 payment received ($5,500)", time: "2d ago", type: "payment" },
      { action: "Approved Milestone: UI Design Phase 1", time: "3d ago", type: "system" },
      { action: "Sent email: Phase 1 deliverables ready for review", time: "4d ago", type: "email" },
      { action: "Automated reminder: INV-0044 overdue", time: "5d ago", type: "automation" },
      { action: "Discovery call completed — 45 min", time: "1w ago", type: "call" },
      { action: "Viewed proposal for E-commerce Redesign 3 times", time: "1w ago", type: "document" },
      { action: "Proposal sent: E-commerce Redesign", time: "2w ago", type: "email" },
      { action: "AI enriched profile — 99% confidence", time: "2w ago", type: "system" },
      { action: "Client added from returning client record", time: "Jan 15", type: "system" },
    ],
    notes: [
      "Prefers email over calls. Always CC Rachel on financial matters.",
      "Budget flexible for Q2 — mentioned expanding scope to include mobile app.",
      "Very detail-oriented — send detailed progress reports weekly.",
    ],
  },
  "2": {
    id: "2", name: "James Liu", company: "Terra Finance", email: "james@terra.io", phone: "+1 (646) 555-0133", website: "terra.io",
    status: "active", healthScore: 88, totalRevenue: 22000, revenueDisplay: "$22,000", activeProjects: 1, completedProjects: 0,
    tags: ["Enterprise", "FinTech", "Retainer"], source: "Conference", createdAt: "Feb 10, 2025",
    enrichment: { linkedin: "linkedin.com/in/jamesliu", twitter: "@jamesliu_cfo", companySize: "1000+", industry: "Financial Services", confidence: 98 },
    secondaryContacts: [
      { name: "Amy Zhang", role: "Head of Design", email: "amy@terra.io", portalAccess: true },
    ],
    customFields: [
      { label: "Preferred Contact Method", value: "Slack", type: "dropdown" },
      { label: "Timezone", value: "EST (UTC-5)", type: "text" },
      { label: "Compliance Review Required", value: "Yes", type: "text" },
    ],
    projects: [
      { name: "Dashboard Analytics Platform", status: "Active", value: "$22,000", progress: 42 },
    ],
    invoices: [
      { id: "i6", number: "INV-0041", amount: "$5,500", status: "paid", date: "Mar 05", project: "Dashboard Analytics" },
      { id: "i7", number: "INV-0045", amount: "$5,500", status: "pending", date: "Apr 01", project: "Dashboard Analytics" },
    ],
    documents: [
      { id: "d5", name: "Analytics Platform Proposal", type: "proposal", status: "Signed", date: "Feb 18" },
      { id: "d6", name: "Service Agreement", type: "contract", status: "Active", date: "Feb 20" },
    ],
    timeline: [
      { action: "Weekly status call completed — 30 min", time: "30m ago", type: "call" },
      { action: "Milestone 2 approved by client", time: "2d ago", type: "system" },
      { action: "Payment of $5,500 released from escrow", time: "3d ago", type: "payment" },
      { action: "Sent email: Milestone 2 deliverables", time: "5d ago", type: "email" },
      { action: "Contract signed by both parties", time: "Feb 20", type: "contract" },
    ],
    notes: [
      "Very responsive on Slack. Compliance review required for all external-facing features.",
    ],
  },
};

// Fallback for unknown IDs
function getClientById(id: string): ClientDetail {
  return clientDatabase[id] ?? {
    id, name: "Unknown Client", company: "—", email: "—", phone: "—", website: "—",
    status: "lead" as const, healthScore: 0, totalRevenue: 0, revenueDisplay: "$0", activeProjects: 0, completedProjects: 0,
    tags: [], source: "—", createdAt: "—",
    enrichment: { linkedin: "", twitter: "", companySize: "—", industry: "—", confidence: 0 },
    secondaryContacts: [], customFields: [], projects: [], invoices: [], documents: [], timeline: [], notes: [],
  };
}

const allTags = ["Enterprise", "VIP", "Startup", "FinTech", "HealthTech", "E-commerce", "DevTools", "SaaS", "AI", "Marketing", "Retainer"];

/* ═══════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════ */

const timelineIcons: Record<string, React.ElementType> = {
  email: Mail,
  call: Phone,
  payment: CreditCard,
  contract: Shield,
  document: FileText,
  note: PenLine,
  system: AlertCircle,
  automation: Zap,
};

function TagBadge({ tag, removable, onRemove }: { tag: string; removable?: boolean; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
      {tag}
      {removable && onRemove && (
        <button onClick={onRemove} className="hover:text-zinc-900 transition-colors">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

const invoiceStatusStyles: Record<string, string> = {
  paid: "text-zinc-600",
  pending: "text-zinc-500",
  overdue: "text-zinc-900 font-bold",
};

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

type DetailTab = "overview" | "activity" | "invoices" | "documents";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const client = getClientById(clientId);
  // Fetch live data from Supabase — overrides mock name/company/email when available
  const { data: liveClient } = useClient(clientId);
  const [activeTab, setActiveTab] = React.useState<DetailTab>("overview");
  const statusLabel: Record<string, string> = { active: "Active", lead: "Lead", past: "Past" };

  // Overlay real data from DB on top of the mock detail structure
  const displayName    = liveClient?.name         ?? client.name;
  const displayCompany = liveClient?.company_name ?? client.company;
  const displayEmail   = liveClient?.email        ?? client.email;

  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity", count: client.timeline.length },
    { id: "invoices", label: "Invoices", count: client.invoices.length },
    { id: "documents", label: "Documents", count: client.documents.length },
  ];

  const paidInvoices = client.invoices.filter((i) => i.status === "paid");
  const pendingInvoices = client.invoices.filter((i) => i.status === "pending");
  const overdueInvoices = client.invoices.filter((i) => i.status === "overdue");

  return (
    <div className="space-y-8">
      {/* Back Link + Header */}
      <div>
        <Link href="/clients" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <H1 className="text-2xl truncate">{displayName}</H1>
                {client.enrichment.confidence >= 90 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex-shrink-0">
                    <Bot className="h-3 w-3" /> Enriched
                  </span>
                )}
              </div>
              <Muted className="truncate block">{displayCompany} · Client since {client.createdAt}</Muted>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium capitalize">
              {statusLabel[client.status] ?? client.status}
            </Badge>
            <Button variant="outline" size="sm" className="border-zinc-200 gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send Email
            </Button>
            <Button variant="outline" size="sm" className="border-zinc-200 gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Schedule
            </Button>
            <Button size="sm" className="gap-1.5 font-semibold">
              <Plus className="h-3.5 w-3.5" /> New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Surface className="p-5">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Health Score</Muted>
            <Heart className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">{client.healthScore}</div>
          <div className="h-[3px] w-full bg-zinc-100 mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${client.healthScore}%` }} />
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Lifetime Revenue</Muted>
            <DollarSign className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">{client.revenueDisplay}</div>
          <Muted className="text-[10px] mt-1 truncate">{client.activeProjects} active · {client.completedProjects} completed</Muted>
        </Surface>

        <Surface className="p-5">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Invoices</Muted>
            <CreditCard className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">{client.invoices.length}</div>
          <Muted className="text-[10px] mt-1 truncate">{paidInvoices.length} paid · {pendingInvoices.length} pending · {overdueInvoices.length} overdue</Muted>
        </Surface>

        <Surface className="p-5">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Projects</Muted>
            <Briefcase className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">{client.projects.length}</div>
          <Muted className="text-[10px] mt-1">Lifetime engagements</Muted>
        </Surface>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex items-center gap-1 border-b border-zinc-200 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("ml-1 text-[10px]", activeTab === tab.id ? "text-zinc-900" : "text-zinc-400")}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Overview Tab ─── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* Left Column */}
          <div className="md:col-span-7 space-y-6">
            {/* AI Enrichment */}
            <Surface className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">AI Enrichment</Muted>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Bot className="h-3 w-3" /> {client.enrichment.confidence}% confidence
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Muted className="text-[10px]">Company Size</Muted>
                  <P className="text-sm font-medium">{client.enrichment.companySize}</P>
                </div>
                <div className="space-y-1">
                  <Muted className="text-[10px]">Industry</Muted>
                  <P className="text-sm font-medium">{client.enrichment.industry}</P>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {client.enrichment.linkedin && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    <Linkedin className="h-3.5 w-3.5" strokeWidth={1.5} /> LinkedIn
                  </span>
                )}
                {client.enrichment.twitter && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    <Twitter className="h-3.5 w-3.5" strokeWidth={1.5} /> {client.enrichment.twitter}
                  </span>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">Contact</Muted>
                {[
                  { icon: Mail, value: displayEmail },
                  { icon: Phone, value: client.phone },
                  { icon: Globe, value: client.website },
                ].map((item) => (
                  <div key={item.value} className="flex items-center gap-2 text-sm text-zinc-600 min-w-0">
                    <item.icon className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{item.value}</span>
                  </div>
                ))}
              </div>
            </Surface>

            {/* Linked Projects */}
            <div className="space-y-3">
              <H2 className="text-base">Projects</H2>
              <Surface className="divide-y divide-zinc-100">
                {client.projects.length === 0 ? (
                  <div className="p-8 text-center">
                    <Muted className="text-sm">No projects yet.</Muted>
                  </div>
                ) : (
                  client.projects.map((project, i) => (
                    <div key={i} className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 tracking-tight truncate">{project.name}</div>
                          <Muted className="text-xs truncate block">{project.value}</Muted>
                        </div>
                        <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium flex-shrink-0">
                          {project.status}
                        </Badge>
                      </div>
                      <div className="h-[3px] w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </Surface>
            </div>

            {/* Custom Fields / Smart Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <H2 className="text-base">Smart Fields</H2>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 gap-1">
                  <Plus className="h-3 w-3" /> Add Field
                </Button>
              </div>
              <Surface className="divide-y divide-zinc-100">
                {client.customFields.map((field, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between group gap-4">
                    <div className="min-w-0">
                      <Muted className="text-[10px] uppercase tracking-widest font-bold truncate block">{field.label}</Muted>
                      <P className="text-sm font-medium mt-0.5 truncate">{field.value}</P>
                    </div>
                    <PenLine className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                ))}
              </Surface>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:col-span-5 space-y-6">
            {/* Tags */}
            <Surface className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">Tags</Muted>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-zinc-500 gap-1">
                  <Tag className="h-3 w-3" /> Edit
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} removable onRemove={() => {}} />
                ))}
              </div>
            </Surface>

            {/* Secondary Contacts / Stakeholders */}
            <Surface className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">Stakeholders</Muted>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-zinc-500 gap-1">
                  <UserPlus className="h-3 w-3" /> Add
                </Button>
              </div>
              {client.secondaryContacts.length === 0 ? (
                <Muted className="text-xs">No secondary contacts added yet.</Muted>
              ) : (
                <div className="space-y-3">
                  {client.secondaryContacts.map((contact, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <P className="text-sm font-medium truncate">{contact.name}</P>
                          {contact.portalAccess && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-0.5 shrink-0">
                              <Eye className="h-2.5 w-2.5" /> Portal
                            </span>
                          )}
                        </div>
                        <Muted className="text-[10px] uppercase tracking-widest truncate block">{contact.role}</Muted>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 min-w-0">
                          <Mail className="h-2.5 w-2.5 flex-shrink-0" /> <span className="truncate">{contact.email}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Surface>

            {/* Notes */}
            <Surface className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">Notes</Muted>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-zinc-500 gap-1">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {client.notes.length === 0 ? (
                <Muted className="text-xs">No notes yet.</Muted>
              ) : (
                <div className="space-y-2">
                  {client.notes.map((note, i) => (
                    <div key={i} className="p-3 bg-zinc-50 rounded-md">
                      <P className="text-xs text-zinc-700 leading-relaxed">{note}</P>
                    </div>
                  ))}
                </div>
              )}
            </Surface>

            {/* Financial Snapshot */}
            <Surface className="p-6 space-y-3">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">Financial Snapshot</Muted>
              <div className="space-y-2">
                {[
                  { label: "Lifetime Value", value: client.revenueDisplay },
                  { label: "Paid Invoices", value: `${paidInvoices.length} ($${paidInvoices.reduce((s, i) => s + parseInt(i.amount.replace(/[$,]/g, "")), 0).toLocaleString()})` },
                  { label: "Pending", value: `${pendingInvoices.length} ($${pendingInvoices.reduce((s, i) => s + parseInt(i.amount.replace(/[$,]/g, "")), 0).toLocaleString()})` },
                  { label: "Overdue", value: `${overdueInvoices.length} ($${overdueInvoices.reduce((s, i) => s + parseInt(i.amount.replace(/[$,]/g, "")), 0).toLocaleString()})` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <Muted className="text-[10px] uppercase tracking-widest truncate">{item.label}</Muted>
                    <P className="text-sm font-medium truncate">{item.value}</P>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </div>
      )}

      {/* ─── Activity Tab ─── */}
      {activeTab === "activity" && (
        <Surface className="p-6">
          <div className="space-y-1 mb-6">
            <H2 className="text-base">Activity Timeline</H2>
            <Muted className="text-xs">Every interaction with {client.name} — emails, calls, payments, and system events.</Muted>
          </div>
          {client.timeline.length === 0 ? (
            <div className="py-12 text-center">
              <Muted className="text-sm">No activity recorded yet.</Muted>
            </div>
          ) : (
            <div className="space-y-5">
              {client.timeline.map((event, i) => {
                const Icon = timelineIcons[event.type] ?? AlertCircle;
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <P className="text-sm text-zinc-800 leading-snug truncate">{event.action}</P>
                      <div className="flex items-center gap-2">
                        <Muted className="text-[10px] uppercase tracking-widest">{event.time}</Muted>
                        <span className="text-[10px] text-zinc-300 uppercase tracking-widest capitalize">{event.type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      )}

      {/* ─── Invoices Tab ─── */}
      {activeTab === "invoices" && (
        <Surface className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Invoice</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Project</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Amount</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {client.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Muted className="text-sm">No invoices yet.</Muted>
                    </td>
                  </tr>
                ) : (
                  client.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <P className="text-sm font-semibold text-zinc-900">{inv.number}</P>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <P className="text-sm text-zinc-600 truncate">{inv.project}</P>
                      </td>
                      <td className="px-6 py-4">
                        <P className="text-sm font-medium text-zinc-900 whitespace-nowrap">{inv.amount}</P>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn("border-zinc-200 bg-transparent font-medium capitalize flex-shrink-0", invoiceStatusStyles[inv.status])}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Muted className="text-xs whitespace-nowrap">{inv.date}</Muted>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      )}

      {/* ─── Documents Tab ─── */}
      {activeTab === "documents" && (
        <Surface className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Document</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Type</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {client.documents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Muted className="text-sm">No documents yet.</Muted>
                    </td>
                  </tr>
                ) : (
                  client.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4 max-w-[250px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                          </div>
                          <P className="text-sm font-semibold text-zinc-900 truncate">{doc.name}</P>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium capitalize">
                          {doc.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <P className="text-sm text-zinc-600">{doc.status}</P>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Muted className="text-xs">{doc.date}</Muted>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </div>
  );
}
