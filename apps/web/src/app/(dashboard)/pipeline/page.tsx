"use client";

import * as React from "react";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoard, KanbanColumn, KanbanCard } from "@/components/ui/kanban";
import { cn } from "@/lib/utils";
import {
  Plus,
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
  ArrowUpRight,
  Calendar,
  DollarSign,
  TrendingUp,
  Zap,
  Tag,
  ChevronDown,
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
  Clock,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import {
  usePipelineStages,
  useMovePipelineLead,
  useCreatePipelineLead,
  useUpdatePipelineLead,
  useArchivePipelineLead,
  type PipelineLead,
  type PipelineStageData,
  type CreateLeadPayload,
  type UpdateLeadPayload,
} from "@/lib/queries/pipeline";

/* ═══════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════ */

type ViewMode = "board" | "list";

/* ═══════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════ */

/** ─── Pipeline Metrics ─── */
function PipelineMetrics({ stages, isLoading }: { stages: PipelineStageData[]; isLoading: boolean }) {
  const allLeads = stages.flatMap((s) => s.leads);
  const totalValue = allLeads.reduce((s, l) => s + l.numericValue, 0);
  const bookedValue = stages
    .filter((s) => s.id === "contract_signed" || s.id === "active")
    .flatMap((s) => s.leads)
    .reduce((s, l) => s + l.numericValue, 0);
  const conversionRate =
    allLeads.length > 0
      ? Math.round(
          ((stages.find((s) => s.id === "active")?.leads.length ?? 0) /
            allLeads.length) *
            100
        )
      : 0;
  const avgDealSize =
    allLeads.length > 0 ? Math.round(totalValue / allLeads.length) : 0;

  const metrics = [
    {
      label: "Total Pipeline",
      value: `$${totalValue.toLocaleString()}`,
      sub: `${allLeads.length} leads`,
      icon: DollarSign,
    },
    {
      label: "Booked Revenue",
      value: `$${bookedValue.toLocaleString()}`,
      sub: "Contract + Active",
      icon: CheckCircle2,
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      sub: "Inquiry → Active",
      icon: TrendingUp,
    },
    {
      label: "Avg Deal Size",
      value: `$${avgDealSize.toLocaleString()}`,
      sub: "Across all stages",
      icon: Target,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {metrics.map((m) => (
        <Surface key={m.label} className="p-5 flex flex-col items-start min-w-0">
          <div className="flex items-center justify-between pb-2 w-full gap-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
              {m.label}
            </Muted>
            <m.icon className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div
              className="font-bold tracking-tighter text-zinc-900 truncate max-w-full"
              style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}
            >
              {m.value}
            </div>
          )}
          <Muted className="text-[10px] mt-1 truncate max-w-full">{m.sub}</Muted>
        </Surface>
      ))}
    </div>
  );
}

/** ─── AI Priority Banner ─── */
function AIPriorityBanner({
  stages,
  onReview,
}: {
  stages: PipelineStageData[];
  onReview: () => void;
}) {
  const hotLeads = stages.flatMap((s) => s.leads).filter((l) => l.aiPriority === "hot");
  if (hotLeads.length === 0) return null;

  return (
    <Surface className="p-4 flex items-center gap-4 border-zinc-300">
      <div className="h-8 w-8 rounded-md bg-zinc-900 flex items-center justify-center flex-shrink-0">
        <Flame className="h-4 w-4 text-white" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <P className="text-sm font-semibold text-zinc-900 truncate">
          {hotLeads.length} Priority Lead{hotLeads.length > 1 ? "s" : ""} Detected
        </P>
        <Muted className="text-[10px] uppercase tracking-widest truncate block">
          AI flagged {hotLeads.map((l) => l.name).join(", ")} as high-value prospects
          likely to convert.
        </Muted>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-zinc-200 text-xs flex-shrink-0 gap-1.5"
        onClick={onReview}
      >
        <Eye className="h-3.5 w-3.5" />
        Review
      </Button>
    </Surface>
  );
}

/** ─── Tag Badges ─── */
function TagBadge({
  tag,
  removable,
  onRemove,
}: {
  tag: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
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
function LeadCardContent({
  lead,
  onSelect,
}: {
  lead: PipelineLead;
  onSelect: (lead: PipelineLead) => void;
}) {
  return (
    <div className="space-y-3" onClick={() => onSelect(lead)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 tracking-tight truncate">
              {lead.name}
            </div>
            <Muted className="text-[10px] uppercase tracking-widest truncate block">
              {lead.company}
            </Muted>
          </div>
        </div>
        {lead.aiPriority && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
              lead.aiPriority === "hot"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-200 text-zinc-700"
            )}
          >
            {lead.aiPriority === "hot" ? (
              <Flame className="h-2.5 w-2.5" />
            ) : (
              <Target className="h-2.5 w-2.5" />
            )}
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
          <span
            className={cn(
              "text-[10px] uppercase tracking-widest",
              lead.priority === "high"
                ? "text-zinc-900 font-bold"
                : lead.priority === "medium"
                ? "text-zinc-600 font-medium"
                : "text-zinc-400 font-medium"
            )}
          >
            {lead.priority}
          </span>
        </div>
      </div>

      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[10px] text-zinc-400 font-medium self-center">
              +{lead.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Muted className="text-[10px] uppercase tracking-widest">{lead.lastAction}</Muted>
        {lead.enrichment.confidence >= 80 && (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-zinc-500">
            <Bot className="h-2.5 w-2.5" /> Enriched
          </span>
        )}
      </div>
    </div>
  );
}

/** ─── Archive Confirmation Modal ─── */
function ArchiveConfirmModal({
  lead,
  onConfirm,
  onCancel,
  isLoading,
}: {
  lead: PipelineLead;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      <Surface className="relative z-10 p-6 w-full max-w-sm mx-4 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-zinc-600" strokeWidth={1.5} />
          </div>
          <div>
            <P className="font-semibold text-zinc-900">Archive Lead?</P>
            <Muted className="text-xs">This will remove {lead.name} from your pipeline.</Muted>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-zinc-200"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 font-semibold"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Archiving…" : "Archive"}
          </Button>
        </div>
      </Surface>
    </div>
  );
}

/** ─── Lead Detail Drawer ─── */
function LeadDetailDrawer({
  lead,
  stages,
  onClose,
  onMoveStage,
  onEdit,
  onArchive,
}: {
  lead: PipelineLead;
  stages: PipelineStageData[];
  onClose: () => void;
  onMoveStage: (leadId: string, stageId: string) => void;
  onEdit: (lead: PipelineLead) => void;
  onArchive: (lead: PipelineLead) => void;
}) {
  const currentStage = stages.find((s) => s.leads.some((l) => l.id === lead.id));
  const [moveOpen, setMoveOpen] = React.useState(false);

  const timelineTypeIcons: Record<string, React.ElementType> = {
    email: Mail,
    call: Phone,
    note: PenLine,
    system: AlertCircle,
    automation: Zap,
  };

  const handleSendEmail = () => {
    if (lead.email) {
      window.open(`mailto:${lead.email}`, "_blank");
    }
  };

  const handleScheduleCall = () => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, "_blank");
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">
            Lead Detail
          </Muted>
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
            <Muted className="truncate block">{lead.company}</Muted>
          </div>
          {lead.aiPriority && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex-shrink-0",
                lead.aiPriority === "hot"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-200 text-zinc-700"
              )}
            >
              {lead.aiPriority === "hot" ? (
                <Flame className="h-3 w-3" />
              ) : (
                <Target className="h-3 w-3" />
              )}
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
            <Muted className="text-[10px] uppercase tracking-widest font-bold">
              Current Stage
            </Muted>
            <div className="relative">
              <button
                className="text-sm font-medium text-zinc-900 flex items-center gap-1 hover:text-zinc-600 transition-colors"
                onClick={() => setMoveOpen(!moveOpen)}
              >
                {currentStage?.title ?? "Unknown"}{" "}
                <ChevronDown className="h-3 w-3" />
              </button>
              {moveOpen && (
                <div className="absolute left-0 top-7 z-50 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg py-1">
                  {stages.map((s) => (
                    <button
                      key={s.id}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 flex items-center gap-2",
                        currentStage?.id === s.id
                          ? "font-bold text-zinc-900"
                          : "text-zinc-600"
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
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  lead.priority === "high"
                    ? "bg-zinc-900"
                    : lead.priority === "medium"
                    ? "bg-zinc-400"
                    : "bg-zinc-200"
                )}
              />
              <span className="text-sm font-medium text-zinc-900 capitalize">
                {lead.priority}
              </span>
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
              { icon: Mail, value: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
              { icon: Phone, value: lead.phone, href: lead.phone ? `tel:${lead.phone}` : undefined },
              { icon: Globe, value: lead.website, href: lead.website || undefined },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <div
                  key={item.value}
                  className="flex items-center gap-2 text-sm text-zinc-600 min-w-0"
                >
                  <item.icon
                    className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.icon === Globe ? "_blank" : undefined}
                      rel={item.icon === Globe ? "noopener noreferrer" : undefined}
                      className="truncate hover:text-zinc-900 hover:underline transition-colors"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="truncate">{item.value}</span>
                  )}
                </div>
              ))}
          </div>
        </div>

        <Separator />

        {/* AI Enrichment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">
              AI Enrichment
            </Muted>
            {lead.enrichment.confidence > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                <Bot className="h-3 w-3" /> {lead.enrichment.confidence}% confidence
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <Muted className="text-[10px] truncate">Company Size</Muted>
              <P className="text-sm font-medium truncate">
                {lead.enrichment.companySize}
              </P>
            </div>
            <div className="space-y-1 min-w-0">
              <Muted className="text-[10px] truncate">Industry</Muted>
              <P className="text-sm font-medium truncate">{lead.enrichment.industry}</P>
            </div>
          </div>
          {lead.enrichment.linkedin && (
            <div className="flex items-center gap-3">
              <a
                href={lead.enrichment.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <Linkedin className="h-3.5 w-3.5" strokeWidth={1.5} /> LinkedIn Profile
              </a>
            </div>
          )}
        </div>

        {lead.tags.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">Tags</Muted>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Actions</Muted>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-200 text-xs gap-1.5 justify-start"
              onClick={handleSendEmail}
              disabled={!lead.email}
            >
              <Send className="h-3.5 w-3.5" /> Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-200 text-xs gap-1.5 justify-start"
              onClick={handleScheduleCall}
              disabled={!lead.phone}
            >
              <Phone className="h-3.5 w-3.5" /> Call Lead
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-200 text-xs gap-1.5 justify-start"
              onClick={() => onEdit(lead)}
            >
              <PenLine className="h-3.5 w-3.5" /> Edit Lead
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-200 text-xs gap-1.5 justify-start text-zinc-500 hover:text-zinc-900"
              onClick={() => onArchive(lead)}
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-3">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Activity</Muted>
          {lead.timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center mb-2">
                <Clock className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
              </div>
              <Muted className="text-xs">No activity yet</Muted>
              <Muted className="text-[10px] mt-1">Actions like emails and calls will appear here.</Muted>
            </div>
          ) : (
            <div className="relative space-y-4 pl-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-100" />
              {lead.timeline.map((event, i) => {
                const Icon = timelineTypeIcons[event.type] ?? MessageSquare;
                return (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div className="h-5 w-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 -ml-[2px] z-10">
                      <Icon className="h-2.5 w-2.5 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-zinc-900">{event.action}</span>
                      <Muted className="text-[10px] block mt-0.5">{event.time}</Muted>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ─── Add Lead Drawer ─── */
function AddLeadDrawer({
  onClose,
  initialStage = "inquiry",
}: {
  onClose: () => void;
  initialStage?: string;
}) {
  const createLead = useCreatePipelineLead();
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [dealValue, setDealValue] = React.useState("");
  const [source, setSource] = React.useState("Manual Entry");
  const [priority, setPriority] = React.useState<"high" | "medium" | "low">("medium");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createLead.mutateAsync({
      name: name.trim(),
      company: company.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      dealValue: dealValue ? Number(dealValue.replace(/[^0-9.]/g, "")) : undefined,
      priority,
      stageId: initialStage,
      source: source.trim() || "Manual Entry",
    });
    onClose();
  };

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
            { label: "Full Name *", placeholder: "e.g. Sarah Chen", value: name, onChange: setName },
            { label: "Company", placeholder: "e.g. Nexus Labs", value: company, onChange: setCompany },
            { label: "Email", placeholder: "e.g. sarah@nexus.io", value: email, onChange: setEmail },
            { label: "Phone", placeholder: "e.g. +1 (415) 555-0101", value: phone, onChange: setPhone },
            { label: "Website", placeholder: "e.g. https://nexus.io", value: website, onChange: setWebsite },
            { label: "Deal Value ($)", placeholder: "e.g. 8200", value: dealValue, onChange: setDealValue },
            { label: "Lead Source", placeholder: "e.g. Referral, LinkedIn", value: source, onChange: setSource },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                {field.label}
              </label>
              <Input
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-9 bg-white border-zinc-200 text-sm"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
              Priority
            </label>
            <div className="flex items-center gap-2">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-colors",
                    priority === p
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="h-5 w-5 rounded bg-zinc-100 flex items-center justify-center">
              <Bot className="h-3 w-3 text-zinc-400" />
            </div>
            <Muted className="text-[10px] uppercase tracking-widest">
              AI will auto-enrich after creation
            </Muted>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={handleSubmit}
            disabled={!name.trim() || createLead.isPending}
          >
            {createLead.isPending ? "Creating…" : "Create Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** ─── Edit Lead Drawer ─── */
function EditLeadDrawer({
  lead,
  onClose,
}: {
  lead: PipelineLead;
  onClose: () => void;
}) {
  const updateLead = useUpdatePipelineLead();
  const [name, setName] = React.useState(lead.name);
  const [company, setCompany] = React.useState(lead.company);
  const [email, setEmail] = React.useState(lead.email);
  const [phone, setPhone] = React.useState(lead.phone);
  const [website, setWebsite] = React.useState(lead.website);
  const [dealValue, setDealValue] = React.useState(
    lead.numericValue > 0 ? String(lead.numericValue) : ""
  );
  const [source, setSource] = React.useState(lead.source);
  const [priority, setPriority] = React.useState<"high" | "medium" | "low">(lead.priority);
  const [tagInput, setTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>(lead.tags);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await updateLead.mutateAsync({
      id: lead.id,
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim(),
      dealValue: dealValue ? Number(dealValue.replace(/[^0-9.]/g, "")) : 0,
      priority,
      source: source.trim() || "Manual Entry",
      tags,
    });
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-zinc-200 z-[55] overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Edit Lead</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {[
            { label: "Full Name *", placeholder: "e.g. Sarah Chen", value: name, onChange: setName },
            { label: "Company", placeholder: "e.g. Nexus Labs", value: company, onChange: setCompany },
            { label: "Email", placeholder: "e.g. sarah@nexus.io", value: email, onChange: setEmail },
            { label: "Phone", placeholder: "e.g. +1 (415) 555-0101", value: phone, onChange: setPhone },
            { label: "Website", placeholder: "e.g. https://nexus.io", value: website, onChange: setWebsite },
            { label: "Deal Value ($)", placeholder: "e.g. 8200", value: dealValue, onChange: setDealValue },
            { label: "Lead Source", placeholder: "e.g. Referral", value: source, onChange: setSource },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                {field.label}
              </label>
              <Input
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-9 bg-white border-zinc-200 text-sm"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
              Priority
            </label>
            <div className="flex items-center gap-2">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-colors",
                    priority === p
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
              Tags
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                className="h-9 bg-white border-zinc-200 text-sm flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-zinc-200 px-3"
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} removable onRemove={() => removeTag(tag)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={handleSubmit}
            disabled={!name.trim() || updateLead.isPending}
          >
            {updateLead.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** ─── List View ─── */
function ListView({
  stages,
  searchQuery,
  priorityFilter,
  tagFilter,
  onSelectLead,
}: {
  stages: PipelineStageData[];
  searchQuery: string;
  priorityFilter: string;
  tagFilter: string;
  onSelectLead: (lead: PipelineLead) => void;
}) {
  const allLeads = stages.flatMap((s) => s.leads.map((l) => ({ ...l, stage: s.title })));
  const filtered = allLeads.filter((l) => {
    const matchesSearch =
      searchQuery === "" ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase());
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
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                Lead
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                Value
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden sm:table-cell">
                Stage
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">
                Priority
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden lg:table-cell">
                Tags
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right hidden sm:table-cell">
                Last Action
              </th>
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
                <tr
                  key={lead.id}
                  className="group hover:bg-zinc-50/50 transition-colors cursor-pointer"
                  onClick={() => onSelectLead(lead)}
                >
                  <td className="px-6 py-4 max-w-[150px] sm:max-w-xs w-full">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-zinc-900 tracking-tight truncate block">
                            {lead.name}
                          </span>
                          {lead.aiPriority === "hot" && (
                            <Flame className="h-3 w-3 text-zinc-900 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">{lead.company}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-900">{lead.value}</td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className="border-zinc-200 text-zinc-600 bg-transparent font-medium"
                    >
                      {lead.stage}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          lead.priority === "high"
                            ? "bg-zinc-900"
                            : lead.priority === "medium"
                            ? "bg-zinc-400"
                            : "bg-zinc-200"
                        )}
                      />
                      <span className="text-xs text-zinc-600 capitalize">{lead.priority}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.slice(0, 2).map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                      {lead.tags.length > 2 && (
                        <span className="text-[10px] text-zinc-400 font-medium self-center">
                          +{lead.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right hidden sm:table-cell">
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

const ALL_TAGS = ["Design", "Development", "Branding", "Marketing", "Retainer", "One-off", "Enterprise", "Startup"];

export default function PipelinePage() {
  const { data: stages = [], isLoading } = usePipelineStages();
  const moveLeadMutation = useMovePipelineLead();
  const archiveLeadMutation = useArchivePipelineLead();

  const [viewMode, setViewMode] = React.useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [tagFilter, setTagFilter] = React.useState("all");
  const [selectedLead, setSelectedLead] = React.useState<PipelineLead | null>(null);
  const [editingLead, setEditingLead] = React.useState<PipelineLead | null>(null);
  const [archivingLead, setArchivingLead] = React.useState<PipelineLead | null>(null);
  const [addLeadOpen, setAddLeadOpen] = React.useState(false);
  const [addLeadInitialStage, setAddLeadInitialStage] = React.useState("inquiry");
  const [priorityFilterOpen, setPriorityFilterOpen] = React.useState(false);
  const [tagFilterOpen, setTagFilterOpen] = React.useState(false);

  // Drag-and-drop state
  const [dragOverStageId, setDragOverStageId] = React.useState<string | null>(null);
  const draggingLeadRef = React.useRef<{ leadId: string; fromStageId: string } | null>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handler = () => {
      setPriorityFilterOpen(false);
      setTagFilterOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Filter leads within stages for the board view
  const filteredStages = React.useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      leads: stage.leads.filter((l) => {
        const matchesSearch =
          searchQuery === "" ||
          l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.company.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = priorityFilter === "all" || l.priority === priorityFilter;
        const matchesTag = tagFilter === "all" || l.tags.includes(tagFilter);
        return matchesSearch && matchesPriority && matchesTag;
      }),
    }));
  }, [stages, searchQuery, priorityFilter, tagFilter]);

  const handleMoveLeadToStage = (leadId: string, targetStageId: string) => {
    moveLeadMutation.mutate({ leadId, stageId: targetStageId });
    setSelectedLead(null);
  };

  const handleArchiveConfirm = async () => {
    if (!archivingLead) return;
    await archiveLeadMutation.mutateAsync(archivingLead.id);
    setArchivingLead(null);
    setSelectedLead(null);
  };

  const handleOpenAddLead = (stageId = "inquiry") => {
    setAddLeadInitialStage(stageId);
    setAddLeadOpen(true);
  };

  const handleEditLead = (lead: PipelineLead) => {
    setSelectedLead(null);
    setEditingLead(lead);
  };

  const handleArchiveLead = (lead: PipelineLead) => {
    setArchivingLead(lead);
  };

  const handleReviewHotLeads = () => {
    setPriorityFilter("high");
    // Also scroll to board/list
  };

  // Drag handlers
  const handleDragStart = (leadId: string, fromStageId: string) => {
    draggingLeadRef.current = { leadId, fromStageId };
  };

  const handleDragEnd = () => {
    draggingLeadRef.current = null;
    setDragOverStageId(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const dragging = draggingLeadRef.current;
    if (!dragging) return;
    if (dragging.fromStageId === targetStageId) return;
    moveLeadMutation.mutate({ leadId: dragging.leadId, stageId: targetStageId });
    draggingLeadRef.current = null;
  };

  const totalLeads = stages.flatMap((s) => s.leads).length;

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
          <div className="min-w-0">
            <H1 className="truncate">Pipeline</H1>
            <Muted className="truncate">
              {isLoading ? "Loading…" : `${totalLeads} leads across ${stages.length} stages`}
            </Muted>
          </div>
          <Button
            className="font-semibold px-4 sm:px-5 gap-2 shrink-0 w-full sm:w-auto"
            onClick={() => handleOpenAddLead()}
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className="hidden sm:inline">Add Lead</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Financial Metrics */}
        <PipelineMetrics stages={stages} isLoading={isLoading} />

        {/* AI Priority Banner */}
        {!isLoading && (
          <AIPriorityBanner stages={stages} onReview={handleReviewHotLeads} />
        )}

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
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 border-zinc-200 gap-1.5",
                priorityFilter !== "all" && "border-zinc-900"
              )}
              onClick={() => {
                setPriorityFilterOpen(!priorityFilterOpen);
                setTagFilterOpen(false);
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              Priority{priorityFilter !== "all" ? `: ${priorityFilter}` : ""}
            </Button>
            {priorityFilterOpen && (
              <div className="absolute left-0 top-11 z-50 w-36 bg-white border border-zinc-200 rounded-lg shadow-lg py-1">
                {["all", "high", "medium", "low"].map((p) => (
                  <button
                    key={p}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 capitalize",
                      priorityFilter === p && "font-bold text-zinc-900"
                    )}
                    onClick={() => {
                      setPriorityFilter(p);
                      setPriorityFilterOpen(false);
                    }}
                  >
                    {p === "all" ? "All Priorities" : p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 border-zinc-200 gap-1.5",
                tagFilter !== "all" && "border-zinc-900"
              )}
              onClick={() => {
                setTagFilterOpen(!tagFilterOpen);
                setPriorityFilterOpen(false);
              }}
            >
              <Tag className="h-3.5 w-3.5" />
              Tag{tagFilter !== "all" ? `: ${tagFilter}` : ""}
            </Button>
            {tagFilterOpen && (
              <div className="absolute left-0 top-11 z-50 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                <button
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs hover:bg-zinc-50",
                    tagFilter === "all" && "font-bold text-zinc-900"
                  )}
                  onClick={() => {
                    setTagFilter("all");
                    setTagFilterOpen(false);
                  }}
                >
                  All Tags
                </button>
                {ALL_TAGS.map((t) => (
                  <button
                    key={t}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs hover:bg-zinc-50",
                      tagFilter === t && "font-bold text-zinc-900"
                    )}
                    onClick={() => {
                      setTagFilter(t);
                      setTagFilterOpen(false);
                    }}
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
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("all");
                setTagFilter("all");
              }}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}

          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center border border-zinc-200 rounded-md overflow-hidden">
            <button
              className={cn(
                "h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors",
                viewMode === "board"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-500 hover:text-zinc-900"
              )}
              onClick={() => setViewMode("board")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              className={cn(
                "h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors",
                viewMode === "list"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-500 hover:text-zinc-900"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
        </div>

        {/* Board View */}
        {viewMode === "board" && (
          <KanbanBoard>
            {isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="min-w-[280px] space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ))
              : filteredStages.map((stage) => {
                  const stageTotal = stage.leads.reduce((s, l) => s + l.numericValue, 0);
                  const isDropTarget = dragOverStageId === stage.id;
                  return (
                    <KanbanColumn
                      key={stage.id}
                      title=""
                      count={undefined}
                      onDragOver={(e) => handleDragOver(e, stage.id)}
                      onDragLeave={() => setDragOverStageId(null)}
                      onDrop={(e) => handleDrop(e, stage.id)}
                      className={cn(
                        "transition-colors rounded-lg",
                        isDropTarget && "bg-zinc-50 ring-1 ring-zinc-300"
                      )}
                    >
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
                          <button
                            className="h-5 w-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                            onClick={() => handleOpenAddLead(stage.id)}
                            title={`Add lead to ${stage.title}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between px-1 mb-3">
                          <Muted className="text-[10px] uppercase tracking-widest">
                            ${stageTotal.toLocaleString()}
                          </Muted>
                        </div>
                        <div className={cn("h-[2px]", stage.color)} />
                      </div>

                      {/* Lead Cards */}
                      {stage.leads.length === 0 ? (
                        <div
                          className={cn(
                            "flex flex-col items-center justify-center py-12 text-center rounded-md border-2 border-dashed border-transparent transition-colors",
                            isDropTarget && "border-zinc-300 bg-zinc-50/50"
                          )}
                        >
                          <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center mb-3">
                            <User className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                          </div>
                          <Muted className="text-xs">No leads in this stage</Muted>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 text-xs text-zinc-400 gap-1"
                            onClick={() => handleOpenAddLead(stage.id)}
                          >
                            <Plus className="h-3 w-3" /> Add Lead
                          </Button>
                        </div>
                      ) : (
                        stage.leads.map((lead) => {
                          const fromStageId = stages.find((s) =>
                            s.leads.some((l) => l.id === lead.id)
                          )?.id ?? stage.id;
                          return (
                            <KanbanCard
                              key={lead.id}
                              id={lead.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("leadId", lead.id);
                                handleDragStart(lead.id, fromStageId);
                              }}
                              onDragEnd={handleDragEnd}
                            >
                              <LeadCardContent lead={lead} onSelect={setSelectedLead} />
                            </KanbanCard>
                          );
                        })
                      )}
                    </KanbanColumn>
                  );
                })}
          </KanbanBoard>
        )}

        {/* List View */}
        {viewMode === "list" && !isLoading && (
          <ListView
            stages={filteredStages}
            searchQuery={searchQuery}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            onSelectLead={setSelectedLead}
          />
        )}

        {viewMode === "list" && isLoading && (
          <Surface className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </Surface>
        )}
      </div>

      {/* Overlay backdrop for drawers */}
      {(selectedLead || addLeadOpen || editingLead) && (
        <div
          className="fixed inset-0 bg-black/10 z-40"
          onClick={() => {
            setSelectedLead(null);
            setAddLeadOpen(false);
            setEditingLead(null);
          }}
        />
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onMoveStage={handleMoveLeadToStage}
          onEdit={handleEditLead}
          onArchive={handleArchiveLead}
        />
      )}

      {/* Add Lead Drawer */}
      {addLeadOpen && (
        <AddLeadDrawer
          onClose={() => setAddLeadOpen(false)}
          initialStage={addLeadInitialStage}
        />
      )}

      {/* Edit Lead Drawer */}
      {editingLead && (
        <EditLeadDrawer
          lead={editingLead}
          onClose={() => setEditingLead(null)}
        />
      )}

      {/* Archive Confirmation Modal */}
      {archivingLead && (
        <ArchiveConfirmModal
          lead={archivingLead}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchivingLead(null)}
          isLoading={archiveLeadMutation.isPending}
        />
      )}
    </>
  );
}
