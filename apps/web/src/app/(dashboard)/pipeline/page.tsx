"use client";

import * as React from "react";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { KanbanBoard, KanbanColumn, KanbanCard } from "@/components/ui/kanban";
import { cn } from "@/lib/utils";
import {
  Plus,
  MoreHorizontal,
  Sparkles,
  User,
  Search,
  Filter,
  LayoutGrid,
  List,
  X,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Twitter,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Zap,
  Tag,
  ChevronDown,
  Settings2,
  GripVertical,
  Trash2,
  PenLine,
  Archive,
  Send,
  Bot,
  Eye,
  CheckCircle2,
  AlertCircle,
  Flame,
  Target,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════ */

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  value: string;
  numericValue: number;
  priority: "high" | "medium" | "low";
  aiPriority: "hot" | "likely" | null;
  lastAction: string;
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
  timeline: TimelineEvent[];
  automations: StageAutomation[];
}

interface TimelineEvent {
  action: string;
  time: string;
  type: "email" | "call" | "note" | "system" | "automation";
}

interface StageAutomation {
  id: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

interface PipelineStage {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
  automations: StageAutomation[];
}

type ViewMode = "board" | "list";

/* ═══════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════ */

const allTags = ["Design", "Development", "Branding", "Marketing", "Retainer", "One-off", "Enterprise", "Startup"];

const defaultAutomations: StageAutomation[] = [
  { id: "a1", trigger: "Lead enters stage", action: "Send welcome email", enabled: true },
  { id: "a2", trigger: "Lead enters stage", action: "Send scheduling link", enabled: false },
  { id: "a3", trigger: "Lead enters stage", action: "Send questionnaire", enabled: false },
  { id: "a4", trigger: "24h no response", action: "Send follow-up nudge", enabled: true },
];

const initialStages: PipelineStage[] = [
  {
    id: "inquiry",
    title: "Inquiry",
    color: "bg-zinc-900",
    automations: [
      { id: "a1", trigger: "Lead enters stage", action: "Send welcome email", enabled: true },
      { id: "a2", trigger: "24h no response", action: "Send follow-up nudge", enabled: true },
    ],
    leads: [
      {
        id: "1", name: "Sarah Chen", company: "Nexus Labs", email: "sarah@nexus.io", phone: "+1 (415) 555-0101", website: "nexus.io",
        value: "$8,200", numericValue: 8200, priority: "high", aiPriority: "hot", lastAction: "2d ago",
        tags: ["Development", "Enterprise"], source: "Website Form", createdAt: "Mar 10",
        enrichment: { linkedin: "linkedin.com/in/sarachen", twitter: "@sarahchen_dev", companySize: "50-200", industry: "SaaS / AI", confidence: 94 },
        timeline: [
          { action: "AI enriched lead profile automatically", time: "2d ago", type: "system" },
          { action: "Submitted inquiry via website embed", time: "2d ago", type: "email" },
          { action: "Welcome email sent automatically", time: "2d ago", type: "automation" },
        ],
        automations: [],
      },
      {
        id: "2", name: "Marcus Webb", company: "Vesper AI", email: "marcus@vesper.ai", phone: "+1 (212) 555-0188", website: "vesper.ai",
        value: "$3,100", numericValue: 3100, priority: "medium", aiPriority: null, lastAction: "5d ago",
        tags: ["Design", "Startup"], source: "Referral", createdAt: "Mar 07",
        enrichment: { linkedin: "linkedin.com/in/marcuswebb", twitter: "@marcuswebb", companySize: "10-50", industry: "FinTech", confidence: 78 },
        timeline: [
          { action: "Referral from David Frost", time: "5d ago", type: "note" },
          { action: "Welcome email sent automatically", time: "5d ago", type: "automation" },
        ],
        automations: [],
      },
      {
        id: "3", name: "Priya Sharma", company: "Bloom Studio", email: "priya@bloom.studio", phone: "+44 20 7946 0958", website: "bloom.studio",
        value: "$5,400", numericValue: 5400, priority: "low", aiPriority: null, lastAction: "1w ago",
        tags: ["Branding", "One-off"], source: "LinkedIn", createdAt: "Mar 03",
        enrichment: { linkedin: "linkedin.com/in/priyasharma", twitter: "", companySize: "1-10", industry: "Creative Agency", confidence: 62 },
        timeline: [
          { action: "Reached out via LinkedIn DM", time: "1w ago", type: "email" },
        ],
        automations: [],
      },
    ],
  },
  {
    id: "proposal_sent",
    title: "Proposal Sent",
    color: "bg-zinc-700",
    automations: [
      { id: "a3", trigger: "Lead enters stage", action: "Send proposal link", enabled: true },
      { id: "a4", trigger: "48h no response", action: "Send gentle follow-up", enabled: true },
    ],
    leads: [
      {
        id: "4", name: "Tom Ashford", company: "Starlight Digital", email: "tom@starlight.co", phone: "+1 (310) 555-0144", website: "starlight.co",
        value: "$4,500", numericValue: 4500, priority: "medium", aiPriority: "likely", lastAction: "3d ago",
        tags: ["Marketing", "Retainer"], source: "Cold Outreach", createdAt: "Feb 28",
        enrichment: { linkedin: "linkedin.com/in/tomashford", twitter: "@tomashford", companySize: "10-50", industry: "Digital Marketing", confidence: 85 },
        timeline: [
          { action: "Proposal sent via Smart File", time: "3d ago", type: "email" },
          { action: "Discovery call completed", time: "5d ago", type: "call" },
          { action: "Initial inquiry received", time: "1w ago", type: "email" },
        ],
        automations: [],
      },
      {
        id: "5", name: "Lena Park", company: "Orion Health", email: "lena@orion.health", phone: "+1 (617) 555-0199", website: "orion.health",
        value: "$12,000", numericValue: 12000, priority: "high", aiPriority: "hot", lastAction: "1d ago",
        tags: ["Development", "Enterprise"], source: "Website Form", createdAt: "Mar 01",
        enrichment: { linkedin: "linkedin.com/in/lenapark", twitter: "@lenapark_cto", companySize: "200-1000", industry: "HealthTech", confidence: 97 },
        timeline: [
          { action: "Opened proposal 4 times", time: "1d ago", type: "system" },
          { action: "Proposal sent via Smart File", time: "3d ago", type: "email" },
          { action: "Discovery call — very positive", time: "5d ago", type: "call" },
        ],
        automations: [],
      },
    ],
  },
  {
    id: "contract_signed",
    title: "Contract Signed",
    color: "bg-zinc-500",
    automations: [
      { id: "a5", trigger: "Lead enters stage", action: "Generate invoice draft", enabled: true },
      { id: "a6", trigger: "Lead enters stage", action: "Notify team on Slack", enabled: false },
    ],
    leads: [
      {
        id: "6", name: "David Frost", company: "Acme Corp", email: "david@acme.co", phone: "+1 (415) 555-0199", website: "acme.co",
        value: "$18,500", numericValue: 18500, priority: "high", aiPriority: null, lastAction: "4h ago",
        tags: ["Development", "Enterprise", "Retainer"], source: "Returning Client", createdAt: "Feb 20",
        enrichment: { linkedin: "linkedin.com/in/davidfrost", twitter: "@davidfrost_ceo", companySize: "200-1000", industry: "E-commerce", confidence: 99 },
        timeline: [
          { action: "Contract signed by both parties", time: "4h ago", type: "system" },
          { action: "Invoice draft generated automatically", time: "4h ago", type: "automation" },
          { action: "Final proposal approved", time: "1d ago", type: "email" },
          { action: "Negotiation round 2 completed", time: "3d ago", type: "call" },
        ],
        automations: [],
      },
    ],
  },
  {
    id: "active",
    title: "Active Project",
    color: "bg-zinc-400",
    automations: [
      { id: "a7", trigger: "Lead enters stage", action: "Create project workspace", enabled: true },
    ],
    leads: [
      {
        id: "7", name: "Maria Santos", company: "Orbit Systems", email: "maria@orbit.dev", phone: "+1 (512) 555-0177", website: "orbit.dev",
        value: "$9,800", numericValue: 9800, priority: "medium", aiPriority: null, lastAction: "1h ago",
        tags: ["Design", "Development"], source: "Referral", createdAt: "Feb 15",
        enrichment: { linkedin: "linkedin.com/in/mariasantos", twitter: "@mariasantos", companySize: "50-200", industry: "DevTools", confidence: 91 },
        timeline: [
          { action: "Milestone 1 deliverables uploaded", time: "1h ago", type: "system" },
          { action: "Project workspace created automatically", time: "1w ago", type: "automation" },
          { action: "Contract signed and deposit paid", time: "2w ago", type: "system" },
        ],
        automations: [],
      },
      {
        id: "8", name: "James Liu", company: "Terra Finance", email: "james@terra.io", phone: "+1 (646) 555-0133", website: "terra.io",
        value: "$22,000", numericValue: 22000, priority: "high", aiPriority: null, lastAction: "30m ago",
        tags: ["Development", "Enterprise", "Retainer"], source: "Conference", createdAt: "Feb 10",
        enrichment: { linkedin: "linkedin.com/in/jamesliu", twitter: "@jamesliu_cfo", companySize: "1000+", industry: "Financial Services", confidence: 98 },
        timeline: [
          { action: "Weekly status call completed", time: "30m ago", type: "call" },
          { action: "Milestone 2 approved by client", time: "2d ago", type: "system" },
          { action: "Payment of $5,500 released from escrow", time: "3d ago", type: "system" },
        ],
        automations: [],
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════ */

/** ─── Pipeline Metrics ─── */
function PipelineMetrics({ stages }: { stages: PipelineStage[] }) {
  const allLeads = stages.flatMap((s) => s.leads);
  const totalValue = allLeads.reduce((s, l) => s + l.numericValue, 0);
  const bookedValue = stages
    .filter((s) => s.id === "contract_signed" || s.id === "active")
    .flatMap((s) => s.leads)
    .reduce((s, l) => s + l.numericValue, 0);
  const conversionRate = allLeads.length > 0
    ? Math.round((stages.find((s) => s.id === "active")?.leads.length ?? 0) / allLeads.length * 100)
    : 0;
  const avgDealSize = allLeads.length > 0 ? Math.round(totalValue / allLeads.length) : 0;

  const metrics = [
    { label: "Total Pipeline", value: `$${totalValue.toLocaleString()}`, sub: `${allLeads.length} leads`, icon: DollarSign },
    { label: "Booked Revenue", value: `$${bookedValue.toLocaleString()}`, sub: "Contract + Active", icon: CheckCircle2 },
    { label: "Conversion Rate", value: `${conversionRate}%`, sub: "Inquiry → Active", icon: TrendingUp },
    { label: "Avg Deal Size", value: `$${avgDealSize.toLocaleString()}`, sub: "Across all stages", icon: Target },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {metrics.map((m) => (
        <Surface key={m.label} className="p-5">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">{m.label}</Muted>
            <m.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">{m.value}</div>
          <Muted className="text-[10px] mt-1">{m.sub}</Muted>
        </Surface>
      ))}
    </div>
  );
}

/** ─── AI Priority Banner ─── */
function AIPriorityBanner({ stages }: { stages: PipelineStage[] }) {
  const hotLeads = stages.flatMap((s) => s.leads).filter((l) => l.aiPriority === "hot");
  if (hotLeads.length === 0) return null;

  return (
    <Surface className="p-4 flex items-center gap-4 border-zinc-300">
      <div className="h-8 w-8 rounded-md bg-zinc-900 flex items-center justify-center flex-shrink-0">
        <Flame className="h-4 w-4 text-white" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <P className="text-sm font-semibold text-zinc-900">
          {hotLeads.length} Priority Lead{hotLeads.length > 1 ? "s" : ""} Detected
        </P>
        <Muted className="text-[10px] uppercase tracking-widest">
          AI flagged {hotLeads.map((l) => l.name).join(", ")} as high-value prospects likely to convert.
        </Muted>
      </div>
      <Button variant="outline" size="sm" className="border-zinc-200 text-xs flex-shrink-0 gap-1.5">
        <Eye className="h-3.5 w-3.5" />
        Review
      </Button>
    </Surface>
  );
}

/** ─── Tag Badges ─── */
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

/** ─── Lead Card (Board View) ─── */
function LeadCardContent({ lead, onSelect }: { lead: Lead; onSelect: (lead: Lead) => void }) {
  return (
    <div className="space-y-3" onClick={() => onSelect(lead)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 tracking-tight truncate">{lead.name}</div>
            <Muted className="text-[10px] uppercase tracking-widest">{lead.company}</Muted>
          </div>
        </div>
        {lead.aiPriority && (
          <span className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
            lead.aiPriority === "hot"
              ? "bg-zinc-900 text-white"
              : "bg-zinc-200 text-zinc-700"
          )}>
            {lead.aiPriority === "hot" ? <Flame className="h-2.5 w-2.5" /> : <Target className="h-2.5 w-2.5" />}
            {lead.aiPriority === "hot" ? "Hot" : "Likely"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-zinc-900">{lead.value}</div>
        <div className="flex items-center gap-1.5">
          {lead.priority === "high" && (
            <Sparkles className="h-3 w-3 text-zinc-900" strokeWidth={1.5} />
          )}
          <span className={cn(
            "text-[10px] uppercase tracking-widest",
            lead.priority === "high" ? "text-zinc-900 font-bold"
              : lead.priority === "medium" ? "text-zinc-600 font-medium"
              : "text-zinc-400 font-medium"
          )}>
            {lead.priority}
          </span>
        </div>
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[10px] text-zinc-400 font-medium self-center">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Muted className="text-[10px] uppercase tracking-widest">{lead.lastAction}</Muted>
        {lead.enrichment.confidence >= 90 && (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-zinc-500">
            <Bot className="h-2.5 w-2.5" /> Enriched
          </span>
        )}
      </div>
    </div>
  );
}

/** ─── Stage Settings Dropdown ─── */
function StageSettingsDropdown({ stage, onRename, onRemove }: {
  stage: PipelineStage;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(stage.title);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(!open)}>
        <Settings2 className="h-3.5 w-3.5 text-zinc-400" />
      </Button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg py-1">
          {renaming ? (
            <div className="px-3 py-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(stage.id, draft);
                    setRenaming(false);
                    setOpen(false);
                  }
                }}
              />
            </div>
          ) : (
            <>
              <button
                className="w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                onClick={() => setRenaming(true)}
              >
                <PenLine className="h-3.5 w-3.5 text-zinc-400" /> Rename Stage
              </button>
              <button
                className="w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                onClick={() => { onRemove(stage.id); setOpen(false); }}
              >
                <Trash2 className="h-3.5 w-3.5 text-zinc-400" /> Remove Stage
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** ─── Stage Automations Indicator ─── */
function AutomationIndicator({ automations }: { automations: StageAutomation[] }) {
  const activeCount = automations.filter((a) => a.enabled).length;
  if (activeCount === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
      <Zap className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
      {activeCount}
    </span>
  );
}

/** ─── Lead Detail Drawer ─── */
function LeadDetailDrawer({ lead, stages, onClose, onMoveStage }: {
  lead: Lead;
  stages: PipelineStage[];
  onClose: () => void;
  onMoveStage: (leadId: string, stageId: string) => void;
}) {
  const currentStage = stages.find((s) => s.leads.some((l) => l.id === lead.id));
  const [moveOpen, setMoveOpen] = React.useState(false);

  const timelineIcons: Record<string, React.ElementType> = {
    email: Mail,
    call: Phone,
    note: PenLine,
    system: AlertCircle,
    automation: Zap,
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Lead Detail</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <User className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <H3 className="text-lg truncate">{lead.name}</H3>
            <Muted>{lead.company}</Muted>
          </div>
          {lead.aiPriority && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex-shrink-0",
              lead.aiPriority === "hot" ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700"
            )}>
              {lead.aiPriority === "hot" ? <Flame className="h-3 w-3" /> : <Target className="h-3 w-3" />}
              {lead.aiPriority === "hot" ? "Hot Lead" : "Likely to Book"}
            </span>
          )}
        </div>

        <Separator />

        {/* Contact + Deal Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Deal Value</Muted>
            <div className="text-lg font-bold text-zinc-900">{lead.value}</div>
          </div>
          <div className="space-y-1">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Current Stage</Muted>
            <div className="relative">
              <button
                className="text-sm font-medium text-zinc-900 flex items-center gap-1 hover:text-zinc-600 transition-colors"
                onClick={() => setMoveOpen(!moveOpen)}
              >
                {currentStage?.title ?? "Unknown"} <ChevronDown className="h-3 w-3" />
              </button>
              {moveOpen && (
                <div className="absolute left-0 top-7 z-50 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg py-1">
                  {stages.map((s) => (
                    <button
                      key={s.id}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 flex items-center gap-2",
                        currentStage?.id === s.id ? "font-bold text-zinc-900" : "text-zinc-600"
                      )}
                      onClick={() => {
                        onMoveStage(lead.id, s.id);
                        setMoveOpen(false);
                      }}
                    >
                      <div className={cn("h-2 w-2 rounded-full", s.color)} />
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Priority</Muted>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
                lead.priority === "high" ? "bg-zinc-900" : lead.priority === "medium" ? "bg-zinc-400" : "bg-zinc-200"
              )} />
              <span className="text-sm font-medium text-zinc-900 capitalize">{lead.priority}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Source</Muted>
            <div className="text-sm font-medium text-zinc-900">{lead.source}</div>
          </div>
        </div>

        <Separator />

        {/* Contact Details */}
        <div className="space-y-3">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Contact</Muted>
          <div className="space-y-2">
            {[
              { icon: Mail, value: lead.email },
              { icon: Phone, value: lead.phone },
              { icon: Globe, value: lead.website },
            ].map((item) => (
              <div key={item.value} className="flex items-center gap-2 text-sm text-zinc-600">
                <item.icon className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                {item.value}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* AI Enrichment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">AI Enrichment</Muted>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              <Bot className="h-3 w-3" /> {lead.enrichment.confidence}% confidence
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Muted className="text-[10px]">Company Size</Muted>
              <P className="text-sm font-medium">{lead.enrichment.companySize}</P>
            </div>
            <div className="space-y-1">
              <Muted className="text-[10px]">Industry</Muted>
              <P className="text-sm font-medium">{lead.enrichment.industry}</P>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lead.enrichment.linkedin && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <Linkedin className="h-3.5 w-3.5" strokeWidth={1.5} /> LinkedIn
              </span>
            )}
            {lead.enrichment.twitter && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <Twitter className="h-3.5 w-3.5" strokeWidth={1.5} /> {lead.enrichment.twitter}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-3">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Tags</Muted>
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>

        <Separator />

        {/* Activity Timeline */}
        <div className="space-y-3">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Activity</Muted>
          <div className="space-y-4">
            {lead.timeline.map((event, i) => {
              const Icon = timelineIcons[event.type] ?? AlertCircle;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-3 w-3 text-zinc-500" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-0.5">
                    <P className="text-xs text-zinc-700 leading-snug">{event.action}</P>
                    <Muted className="text-[10px] uppercase tracking-widest">{event.time}</Muted>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Actions</Muted>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="border-zinc-200 text-xs gap-1.5 justify-start">
              <Send className="h-3.5 w-3.5" /> Send Email
            </Button>
            <Button variant="outline" size="sm" className="border-zinc-200 text-xs gap-1.5 justify-start">
              <Calendar className="h-3.5 w-3.5" /> Schedule Call
            </Button>
            <Button variant="outline" size="sm" className="border-zinc-200 text-xs gap-1.5 justify-start">
              <PenLine className="h-3.5 w-3.5" /> Edit Lead
            </Button>
            <Button variant="outline" size="sm" className="border-zinc-200 text-xs gap-1.5 justify-start">
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ─── Automations Panel ─── */
function AutomationsPanel({ stage, onClose }: { stage: PipelineStage; onClose: () => void }) {
  const [rules, setRules] = React.useState(stage.automations);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Stage Automations</Muted>
            <H3 className="text-base mt-1">{stage.title}</H3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          {rules.map((rule) => (
            <Surface key={rule.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={cn("h-3.5 w-3.5", rule.enabled ? "text-zinc-900" : "text-zinc-300")} strokeWidth={1.5} />
                  <P className={cn("text-xs font-medium", rule.enabled ? "text-zinc-900" : "text-zinc-400")}>{rule.action}</P>
                </div>
                <button
                  className={cn(
                    "h-5 w-9 rounded-full flex items-center px-0.5 transition-colors",
                    rule.enabled ? "bg-zinc-900 justify-end" : "bg-zinc-200 justify-start"
                  )}
                  onClick={() => setRules((r) => r.map((a) => a.id === rule.id ? { ...a, enabled: !a.enabled } : a))}
                >
                  <div className="h-4 w-4 rounded-full bg-white" />
                </button>
              </div>
              <Muted className="text-[10px] uppercase tracking-widest">Trigger: {rule.trigger}</Muted>
            </Surface>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full border-zinc-200 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Automation Rule
        </Button>
      </div>
    </div>
  );
}

/** ─── Add Lead Drawer ─── */
function AddLeadDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">New Lead</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {[
            { label: "Full Name", placeholder: "e.g. Sarah Chen" },
            { label: "Company", placeholder: "e.g. Nexus Labs" },
            { label: "Email", placeholder: "e.g. sarah@nexus.io" },
            { label: "Phone", placeholder: "e.g. +1 (415) 555-0101" },
            { label: "Deal Value", placeholder: "e.g. $8,200" },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{field.label}</label>
              <Input placeholder={field.placeholder} className="h-9 bg-white border-zinc-200 text-sm" />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Priority</label>
            <div className="flex items-center gap-2">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  className="px-3 py-1.5 rounded-md border border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className="px-2 py-1 rounded bg-zinc-100 text-[10px] font-medium text-zinc-600 uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="h-5 w-5 rounded bg-zinc-100 flex items-center justify-center">
              <Bot className="h-3 w-3 text-zinc-400" />
            </div>
            <Muted className="text-[10px] uppercase tracking-widest">AI will auto-enrich after creation</Muted>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 font-semibold">Create Lead</Button>
        </div>
      </div>
    </div>
  );
}

/** ─── List View ─── */
function ListView({ stages, searchQuery, priorityFilter, tagFilter, onSelectLead }: {
  stages: PipelineStage[];
  searchQuery: string;
  priorityFilter: string;
  tagFilter: string;
  onSelectLead: (lead: Lead) => void;
}) {
  const allLeads = stages.flatMap((s) => s.leads.map((l) => ({ ...l, stage: s.title })));
  const filtered = allLeads.filter((l) => {
    const matchesSearch = searchQuery === "" || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || l.priority === priorityFilter;
    const matchesTag = tagFilter === "all" || l.tags.includes(tagFilter);
    return matchesSearch && matchesPriority && matchesTag;
  });

  return (
    <Surface className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Lead</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Value</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Stage</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Priority</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Tags</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Last Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Muted className="text-sm">No leads match your filters.</Muted>
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.id} className="group hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => onSelectLead(lead)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 tracking-tight">{lead.name}</span>
                          {lead.aiPriority === "hot" && <Flame className="h-3 w-3 text-zinc-900" />}
                        </div>
                        <div className="text-xs text-zinc-500">{lead.company}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-900">{lead.value}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium">
                      {lead.stage}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        lead.priority === "high" ? "bg-zinc-900" : lead.priority === "medium" ? "bg-zinc-400" : "bg-zinc-200"
                      )} />
                      <span className="text-xs text-zinc-600 capitalize">{lead.priority}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.slice(0, 2).map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                      {lead.tags.length > 2 && (
                        <span className="text-[10px] text-zinc-400 font-medium self-center">+{lead.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-zinc-400">{lead.lastAction}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function PipelinePage() {
  const [stages, setStages] = React.useState<PipelineStage[]>(initialStages);
  const [viewMode, setViewMode] = React.useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [tagFilter, setTagFilter] = React.useState("all");
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [addLeadOpen, setAddLeadOpen] = React.useState(false);
  const [automationsStage, setAutomationsStage] = React.useState<PipelineStage | null>(null);
  const [priorityFilterOpen, setPriorityFilterOpen] = React.useState(false);
  const [tagFilterOpen, setTagFilterOpen] = React.useState(false);

  // Filter leads within stages for the board view
  const filteredStages = React.useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      leads: stage.leads.filter((l) => {
        const matchesSearch = searchQuery === "" || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.company.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = priorityFilter === "all" || l.priority === priorityFilter;
        const matchesTag = tagFilter === "all" || l.tags.includes(tagFilter);
        return matchesSearch && matchesPriority && matchesTag;
      }),
    }));
  }, [stages, searchQuery, priorityFilter, tagFilter]);

  // Stage operations
  const handleRenameStage = (id: string, name: string) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, title: name } : s));
  };

  const handleRemoveStage = (id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const handleMoveLeadToStage = (leadId: string, targetStageId: string) => {
    setStages((prev) => {
      let movedLead: Lead | null = null;
      const withoutLead = prev.map((s) => ({
        ...s,
        leads: s.leads.filter((l) => {
          if (l.id === leadId) {
            movedLead = l;
            return false;
          }
          return true;
        }),
      }));
      if (!movedLead) return prev;
      return withoutLead.map((s) =>
        s.id === targetStageId ? { ...s, leads: [...s.leads, movedLead!] } : s
      );
    });
    setSelectedLead(null);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <H1>Pipeline</H1>
            <Muted>
              {stages.flatMap((s) => s.leads).length} leads across {stages.length} stages
            </Muted>
          </div>
          <Button className="font-semibold px-5 gap-2" onClick={() => setAddLeadOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add Lead
          </Button>
        </div>

        {/* Financial Metrics */}
        <PipelineMetrics stages={stages} />

        {/* AI Priority Banner */}
        <AIPriorityBanner stages={stages} />

        {/* Toolbar: Search + Filters + View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white border-zinc-200 text-sm focus:ring-0"
            />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className={cn("h-9 border-zinc-200 gap-1.5", priorityFilter !== "all" && "border-zinc-900")}
              onClick={() => setPriorityFilterOpen(!priorityFilterOpen)}
            >
              <Filter className="h-3.5 w-3.5" />
              Priority{priorityFilter !== "all" ? `: ${priorityFilter}` : ""}
            </Button>
            {priorityFilterOpen && (
              <div className="absolute left-0 top-11 z-50 w-36 bg-white border border-zinc-200 rounded-lg shadow-lg py-1">
                {["all", "high", "medium", "low"].map((p) => (
                  <button
                    key={p}
                    className={cn("w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 capitalize", priorityFilter === p && "font-bold text-zinc-900")}
                    onClick={() => { setPriorityFilter(p); setPriorityFilterOpen(false); }}
                  >
                    {p === "all" ? "All Priorities" : p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag Filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className={cn("h-9 border-zinc-200 gap-1.5", tagFilter !== "all" && "border-zinc-900")}
              onClick={() => setTagFilterOpen(!tagFilterOpen)}
            >
              <Tag className="h-3.5 w-3.5" />
              Tag{tagFilter !== "all" ? `: ${tagFilter}` : ""}
            </Button>
            {tagFilterOpen && (
              <div className="absolute left-0 top-11 z-50 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                <button
                  className={cn("w-full px-3 py-2 text-left text-xs hover:bg-zinc-50", tagFilter === "all" && "font-bold text-zinc-900")}
                  onClick={() => { setTagFilter("all"); setTagFilterOpen(false); }}
                >
                  All Tags
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    className={cn("w-full px-3 py-2 text-left text-xs hover:bg-zinc-50", tagFilter === t && "font-bold text-zinc-900")}
                    onClick={() => { setTagFilter(t); setTagFilterOpen(false); }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {(searchQuery || priorityFilter !== "all" || tagFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-zinc-500 gap-1"
              onClick={() => { setSearchQuery(""); setPriorityFilter("all"); setTagFilter("all"); }}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}

          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center border border-zinc-200 rounded-md overflow-hidden">
            <button
              className={cn("h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors", viewMode === "board" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:text-zinc-900")}
              onClick={() => setViewMode("board")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              className={cn("h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors", viewMode === "list" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:text-zinc-900")}
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
        </div>

        {/* Board View */}
        {viewMode === "board" && (
          <KanbanBoard>
            {filteredStages.map((stage) => {
              const stageTotal = stage.leads.reduce((s, l) => s + l.numericValue, 0);
              return (
                <KanbanColumn key={stage.id} title="" count={undefined}>
                  {/* Custom Column Header */}
                  <div className="-mt-4 -mb-1">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">
                          {stage.title}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400">
                          {stage.leads.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AutomationIndicator automations={stage.automations} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setAutomationsStage(stages.find((s) => s.id === stage.id) ?? null)}
                        >
                          <Zap className="h-3.5 w-3.5 text-zinc-400" />
                        </Button>
                        <StageSettingsDropdown
                          stage={stage}
                          onRename={handleRenameStage}
                          onRemove={handleRemoveStage}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1 mb-3">
                      <Muted className="text-[10px] uppercase tracking-widest">${stageTotal.toLocaleString()}</Muted>
                    </div>
                    <div className={cn("h-[2px]", stage.color)} />
                  </div>

                  {/* Lead Cards */}
                  {stage.leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center mb-3">
                        <User className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                      </div>
                      <Muted className="text-xs">No leads in this stage</Muted>
                      <Muted className="text-[10px] mt-1">
                        {searchQuery || priorityFilter !== "all" || tagFilter !== "all" ? "Try adjusting your filters." : "Add or move leads here."}
                      </Muted>
                    </div>
                  ) : (
                    stage.leads.map((lead) => (
                      <KanbanCard key={lead.id} id={lead.id}>
                        <LeadCardContent lead={lead} onSelect={setSelectedLead} />
                      </KanbanCard>
                    ))
                  )}
                </KanbanColumn>
              );
            })}
          </KanbanBoard>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <ListView
            stages={filteredStages}
            searchQuery={searchQuery}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            onSelectLead={setSelectedLead}
          />
        )}
      </div>

      {/* Overlay Drawers */}
      {(selectedLead || addLeadOpen || automationsStage) && (
        <div
          className="fixed inset-0 bg-zinc-900/10 z-40"
          onClick={() => {
            setSelectedLead(null);
            setAddLeadOpen(false);
            setAutomationsStage(null);
          }}
        />
      )}

      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onMoveStage={handleMoveLeadToStage}
        />
      )}

      {addLeadOpen && <AddLeadDrawer onClose={() => setAddLeadOpen(false)} />}

      {automationsStage && (
        <AutomationsPanel
          stage={automationsStage}
          onClose={() => setAutomationsStage(null)}
        />
      )}
    </>
  );
}
