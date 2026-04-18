"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useClient, useUpdateClient, useUpdateClientMeta, useDeleteClient } from "@/lib/queries/clients";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailPageHeader, MetaSeparator } from "@/components/ui/detail-page-header";
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
  Trash2,
  AlertTriangle,
  Loader2,
  Save,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ClientStatus = "active" | "lead" | "past";
type DetailTab = "overview" | "activity" | "invoices" | "documents";

interface TimelineEvent {
  action: string;
  time: string;
  type: "email" | "call" | "payment" | "contract" | "document" | "note" | "system" | "automation";
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

interface Enrichment {
  linkedin?: string;
  twitter?: string;
  companySize?: string;
  industry?: string;
  confidence?: number;
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function getMeta<T>(meta: Record<string, unknown> | null, key: string, fallback: T): T {
  if (!meta) return fallback;
  return (meta[key] as T) ?? fallback;
}

const ALL_TAGS = [
  "Enterprise", "VIP", "Startup", "FinTech", "HealthTech",
  "E-commerce", "DevTools", "SaaS", "AI", "Marketing",
  "Media", "Branding", "VC", "Retainer",
];

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

/* ═══════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════ */

function TagBadge({ tag, removable, onRemove }: { tag: string; removable?: boolean; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
      {tag}
      {removable && onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-zinc-900 transition-colors">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

/** Edit Client Drawer */
function EditClientDrawer({
  clientId,
  initialName,
  initialCompany,
  initialEmail,
  initialPhone,
  initialWebsite,
  initialStatus,
  initialHealthScore,
  onClose,
}: {
  clientId: string;
  initialName: string;
  initialCompany: string;
  initialEmail: string;
  initialPhone: string;
  initialWebsite: string;
  initialStatus: ClientStatus;
  initialHealthScore: number;
  onClose: () => void;
}) {
  const updateClient = useUpdateClient();
  const updateMeta = useUpdateClientMeta();
  const [name, setName] = React.useState(initialName);
  const [company, setCompany] = React.useState(initialCompany);
  const [email, setEmail] = React.useState(initialEmail);
  const [phone, setPhone] = React.useState(initialPhone);
  const [website, setWebsite] = React.useState(initialWebsite);
  const [status, setStatus] = React.useState<ClientStatus>(initialStatus);
  const [healthScore, setHealthScore] = React.useState(String(initialHealthScore));

  const isPending = updateClient.isPending || updateMeta.isPending;

  const handleSave = async () => {
    if (!name.trim()) return;
    await updateClient.mutateAsync({
      id: clientId,
      name: name.trim(),
      company_name: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      health_score: healthScore ? Math.min(100, Math.max(0, Number(healthScore))) : undefined,
    });
    await updateMeta.mutateAsync({
      id: clientId,
      metaPatch: { status },
    });
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-zinc-200 z-[55] overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Edit Client</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {[
            { label: "Full Name *", placeholder: "e.g. David Frost",        value: name,    onChange: setName },
            { label: "Company",     placeholder: "e.g. Acme Corp",          value: company, onChange: setCompany },
            { label: "Email",       placeholder: "e.g. david@acme.co",      value: email,   onChange: setEmail },
            { label: "Phone",       placeholder: "e.g. +1 (415) 555-0199",  value: phone,   onChange: setPhone },
            { label: "Website",     placeholder: "e.g. https://acme.co",    value: website, onChange: setWebsite },
            { label: "Health Score (0–100)", placeholder: "0–100",          value: healthScore, onChange: setHealthScore },
          ].map((f) => (
            <div key={f.label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{f.label}</label>
              <Input
                placeholder={f.placeholder}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-9 bg-white border-zinc-200 text-sm"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</label>
            <div className="flex items-center gap-2">
              {(["lead", "active", "past"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-colors capitalize",
                    status === s
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                  onClick={() => setStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(updateClient.error || updateMeta.error) && (
          <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-500" />
            {((updateClient.error || updateMeta.error) as Error)?.message}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="flex-1 font-semibold gap-1.5" onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Delete Confirm Modal */
function DeleteConfirmModal({
  clientName,
  onConfirm,
  onCancel,
  isLoading,
}: {
  clientName: string;
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
            <P className="font-semibold text-zinc-900">Delete Client?</P>
            <Muted className="text-xs">This will permanently remove {clientName} and all their data.</Muted>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button className="flex-1 font-semibold" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            {isLoading ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Surface>
    </div>
  );
}

/** Add Note Modal */
function AddNoteModal({
  onAdd,
  onClose,
  isLoading,
}: {
  onAdd: (note: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [text, setText] = React.useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <Surface className="relative z-10 p-6 w-full max-w-sm mx-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Add Note</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <textarea
          className="w-full h-28 text-sm bg-zinc-50 border border-zinc-200 rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-900 placeholder:text-zinc-400"
          placeholder="e.g. Prefers email over calls. Always CC Rachel on financial matters."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={() => text.trim() && onAdd(text.trim())}
            disabled={!text.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            Save Note
          </Button>
        </div>
      </Surface>
    </div>
  );
}

/** Add Stakeholder Modal */
function AddStakeholderModal({
  onAdd,
  onClose,
  isLoading,
}: {
  onAdd: (contact: SecondaryContact) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [portalAccess, setPortalAccess] = React.useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <Surface className="relative z-10 p-6 w-full max-w-sm mx-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Add Stakeholder</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Full Name *", placeholder: "e.g. Rachel Frost",   value: name,  onChange: setName },
            { label: "Role",        placeholder: "e.g. CFO",            value: role,  onChange: setRole },
            { label: "Email",       placeholder: "e.g. rachel@acme.co", value: email, onChange: setEmail },
          ].map((f) => (
            <div key={f.label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{f.label}</label>
              <Input
                placeholder={f.placeholder}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-9 bg-white border-zinc-200 text-sm"
              />
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={portalAccess}
              onChange={(e) => setPortalAccess(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span className="text-xs text-zinc-600">Grant client portal access</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={() => name.trim() && onAdd({ name: name.trim(), role: role.trim(), email: email.trim(), portalAccess })}
            disabled={!name.trim() || isLoading}
          >
            Add Stakeholder
          </Button>
        </div>
      </Surface>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { data: client, isLoading, isError, error } = useClient(clientId);
  const updateClient = useUpdateClient();
  const updateMeta = useUpdateClientMeta();
  const deleteClient = useDeleteClient();

  const [activeTab,         setActiveTab]         = React.useState<DetailTab>("overview");
  const [editOpen,          setEditOpen]          = React.useState(false);
  const [deleteOpen,        setDeleteOpen]        = React.useState(false);
  const [addNoteOpen,       setAddNoteOpen]       = React.useState(false);
  const [addStakeholderOpen, setAddStakeholderOpen] = React.useState(false);
  const [tagInput,          setTagInput]          = React.useState("");
  const [editingField,      setEditingField]      = React.useState<string | null>(null);
  const [fieldValue,        setFieldValue]        = React.useState("");

  // Derived from client.metadata
  const meta = (client?.metadata ?? {}) as Record<string, unknown>;
  const status = getMeta<ClientStatus>(meta, "status", "active");
  const totalRevenue = getMeta<number>(meta, "total_revenue", 0);
  const source = getMeta<string>(meta, "source", "—");
  const enrichment = getMeta<Enrichment>(meta, "enrichment", {});
  const notes = getMeta<string[]>(meta, "notes", []);
  const secondaryContacts = getMeta<SecondaryContact[]>(meta, "secondary_contacts", []);
  const customFields = getMeta<CustomField[]>(meta, "custom_fields", []);
  const timeline = getMeta<TimelineEvent[]>(meta, "timeline", []);

  const statusLabel: Record<string, string> = { active: "Active", lead: "Lead", past: "Past" };

  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: "overview",  label: "Overview" },
    { id: "activity",  label: "Activity",  count: timeline.length },
    { id: "invoices",  label: "Invoices" },
    { id: "documents", label: "Documents" },
  ];

  /* ── Handlers ── */

  const handleSendEmail = () => {
    if (client?.email) window.open(`mailto:${client.email}`, "_blank");
  };

  const handleScheduleCall = () => {
    if (client?.phone) window.open(`tel:${client.phone}`, "_blank");
  };

  const handleAddNote = async (note: string) => {
    await updateMeta.mutateAsync({
      id: clientId,
      metaPatch: { notes: [...notes, note] },
    });
    setAddNoteOpen(false);
  };

  const handleDeleteNote = async (index: number) => {
    const updated = notes.filter((_, i) => i !== index);
    await updateMeta.mutateAsync({ id: clientId, metaPatch: { notes: updated } });
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim();
    if (!tag || (client?.tags ?? []).includes(tag)) { setTagInput(""); return; }
    await updateClient.mutateAsync({ id: clientId, tags: [...(client?.tags ?? []), tag] });
    setTagInput("");
  };

  const handleRemoveTag = async (tag: string) => {
    await updateClient.mutateAsync({ id: clientId, tags: (client?.tags ?? []).filter((t) => t !== tag) });
  };

  const handleAddStakeholder = async (contact: SecondaryContact) => {
    await updateMeta.mutateAsync({
      id: clientId,
      metaPatch: { secondary_contacts: [...secondaryContacts, contact] },
    });
    setAddStakeholderOpen(false);
  };

  const handleRemoveStakeholder = async (index: number) => {
    const updated = secondaryContacts.filter((_, i) => i !== index);
    await updateMeta.mutateAsync({ id: clientId, metaPatch: { secondary_contacts: updated } });
  };

  const handleDeleteClient = async () => {
    await deleteClient.mutateAsync(clientId);
    router.push("/clients");
  };

  const handleEditSmartField = (label: string, value: string) => {
    setEditingField(label);
    setFieldValue(value);
  };

  const handleSaveSmartField = async () => {
    if (!editingField) return;
    const updated = customFields.map((f) =>
      f.label === editingField ? { ...f, value: fieldValue } : f
    );
    await updateMeta.mutateAsync({ id: clientId, metaPatch: { custom_fields: updated } });
    setEditingField(null);
  };

  /* ── Loading / Error ── */

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Surface key={i} className="p-5 animate-pulse">
              <div className="h-3 w-20 rounded bg-zinc-100 mb-3" />
              <div className="h-8 w-12 rounded bg-zinc-100" />
            </Surface>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="space-y-4">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
        <Surface className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
          <P className="font-medium text-zinc-900 mb-1">Client not found</P>
          <Muted className="text-sm">{(error as Error)?.message ?? "This client may have been deleted."}</Muted>
          <Button variant="outline" className="mt-4 border-zinc-200" onClick={() => router.push("/clients")}>
            Back to Clients
          </Button>
        </Surface>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <DetailPageHeader
          backHref="/clients"
          backLabel="Back to Clients"
          title={
            <>
              <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
              </div>
              <H1 className="text-2xl font-medium truncate min-w-0">{client.name}</H1>
              <Badge variant="outline" className="flex-shrink-0 bg-transparent text-zinc-600 border-zinc-200 capitalize">
                {statusLabel[status] ?? status}
              </Badge>
              {enrichment.confidence && enrichment.confidence >= 90 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex-shrink-0">
                  <Bot className="h-3 w-3" strokeWidth={1.5} /> Enriched
                </span>
              )}
            </>
          }
          meta={
            <>
              {client.company_name && <span className="whitespace-nowrap">{client.company_name}</span>}
              {client.company_name && <MetaSeparator />}
              <span className="whitespace-nowrap">
                Client since {new Date(client.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
              {source !== "—" && (
                <>
                  <MetaSeparator />
                  <span className="whitespace-nowrap text-xs">via {source}</span>
                </>
              )}
            </>
          }
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none h-9"
                onClick={handleSendEmail}
                disabled={!client.email}
                title={client.email ? `Email ${client.email}` : "No email on file"}
              >
                <Send className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Email</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none h-9"
                onClick={handleScheduleCall}
                disabled={!client.phone}
                title={client.phone ? `Call ${client.phone}` : "No phone on file"}
              >
                <Phone className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Call</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none h-9"
                onClick={() => setEditOpen(true)}
              >
                <PenLine className="sm:mr-2 h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-zinc-500 hover:text-zinc-900 px-3 shrink-0"
                onClick={() => setDeleteOpen(true)}
                title="Delete client"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </>
          }
        />

        {/* ── Metrics Row ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Surface className="p-5">
            <div className="flex items-center justify-between pb-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Health Score</Muted>
              <Heart className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900">
              {client.health_score ?? "—"}
            </div>
            {client.health_score != null && (
              <div className="h-[3px] w-full bg-zinc-100 mt-3 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${client.health_score}%` }} />
              </div>
            )}
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between pb-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Lifetime Revenue</Muted>
              <DollarSign className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900">
              {totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : "$0"}
            </div>
            <Muted className="text-[10px] mt-1">All-time earnings</Muted>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between pb-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Activity</Muted>
              <Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900">
              {timeline.length}
            </div>
            <Muted className="text-[10px] mt-1">Recorded events</Muted>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between pb-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Notes</Muted>
              <MessageSquare className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900">
              {notes.length}
            </div>
            <Muted className="text-[10px] mt-1">Internal notes</Muted>
          </Surface>
        </div>

        {/* ── Tabs ── */}
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
              {/* Contact Info + AI Enrichment */}
              <Surface className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Muted className="text-[10px] uppercase tracking-widest font-bold">Contact & Enrichment</Muted>
                  {enrichment.confidence && enrichment.confidence > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                      <Bot className="h-3 w-3" /> {enrichment.confidence}% confidence
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {[
                    { icon: Mail,  value: client.email,   href: client.email   ? `mailto:${client.email}` : undefined },
                    { icon: Phone, value: client.phone,   href: client.phone   ? `tel:${client.phone}`    : undefined },
                    { icon: Globe, value: client.website, href: client.website ? client.website            : undefined, external: true },
                  ]
                    .filter((i) => i.value)
                    .map((item) => (
                      <div key={String(item.value)} className="flex items-center gap-2 text-sm text-zinc-600 min-w-0">
                        <item.icon className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                        {item.href ? (
                          <a
                            href={item.href}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noopener noreferrer" : undefined}
                            className="truncate hover:text-zinc-900 hover:underline transition-colors"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <span className="truncate">{String(item.value)}</span>
                        )}
                      </div>
                    ))}
                </div>

                {(enrichment.companySize || enrichment.industry || enrichment.linkedin || enrichment.twitter) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      {enrichment.companySize && (
                        <div className="space-y-1">
                          <Muted className="text-[10px]">Company Size</Muted>
                          <P className="text-sm font-medium">{enrichment.companySize}</P>
                        </div>
                      )}
                      {enrichment.industry && (
                        <div className="space-y-1">
                          <Muted className="text-[10px]">Industry</Muted>
                          <P className="text-sm font-medium">{enrichment.industry}</P>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      {enrichment.linkedin && (
                        <a href={enrichment.linkedin} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
                          <Linkedin className="h-3.5 w-3.5" strokeWidth={1.5} /> LinkedIn
                        </a>
                      )}
                      {enrichment.twitter && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                          <Twitter className="h-3.5 w-3.5" strokeWidth={1.5} /> {enrichment.twitter}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </Surface>

              {/* Smart Fields */}
              <div className="space-y-3">
                <H2 className="text-base">Smart Fields</H2>
                {customFields.length === 0 ? (
                  <Surface className="p-8 text-center">
                    <Muted className="text-sm">No custom fields yet.</Muted>
                    <Muted className="text-xs mt-1 block">Custom fields will appear here after editing.</Muted>
                  </Surface>
                ) : (
                  <Surface className="divide-y divide-zinc-100">
                    {customFields.map((field) => (
                      <div key={field.label} className="px-5 py-3 flex items-center justify-between group gap-4">
                        {editingField === field.label ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input
                              value={fieldValue}
                              onChange={(e) => setFieldValue(e.target.value)}
                              className="h-8 text-sm flex-1"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && handleSaveSmartField()}
                            />
                            <Button size="sm" className="h-7 px-2" onClick={handleSaveSmartField}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingField(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0">
                              <Muted className="text-[10px] uppercase tracking-widest font-bold truncate block">{field.label}</Muted>
                              <P className="text-sm font-medium mt-0.5 truncate">{field.value}</P>
                            </div>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => handleEditSmartField(field.label, field.value)}
                            >
                              <PenLine className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-900 transition-colors" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </Surface>
                )}
              </div>

              {/* Projects placeholder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <H2 className="text-base">Projects</H2>
                  <Link href="/projects">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 gap-1">
                      <Plus className="h-3 w-3" /> New Project
                    </Button>
                  </Link>
                </div>
                <Surface className="p-8 text-center">
                  <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                  </div>
                  <Muted className="text-sm">No projects linked yet.</Muted>
                  <Muted className="text-xs mt-1 block">Projects connected to this client will appear here.</Muted>
                </Surface>
              </div>
            </div>

            {/* Right Column */}
            <div className="md:col-span-5 space-y-6">
              {/* Tags */}
              <Surface className="p-5 space-y-3">
                <Muted className="text-[10px] uppercase tracking-widest font-bold">Tags</Muted>
                <div className="flex flex-wrap gap-1.5">
                  {(client.tags ?? []).length === 0 && (
                    <Muted className="text-xs">No tags yet.</Muted>
                  )}
                  {(client.tags ?? []).map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      removable
                      onRemove={() => handleRemoveTag(tag)}
                    />
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Add tag…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    className="h-8 text-sm bg-zinc-50 border-zinc-200 flex-1"
                    list="tag-suggestions"
                  />
                  <datalist id="tag-suggestions">
                    {ALL_TAGS.filter((t) => !(client.tags ?? []).includes(t)).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || updateClient.isPending}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                </div>
              </Surface>

              {/* Stakeholders */}
              <Surface className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Muted className="text-[10px] uppercase tracking-widest font-bold">Stakeholders</Muted>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-zinc-500 gap-1"
                    onClick={() => setAddStakeholderOpen(true)}
                  >
                    <UserPlus className="h-3 w-3" /> Add
                  </Button>
                </div>
                {secondaryContacts.length === 0 ? (
                  <Muted className="text-xs">No secondary contacts added yet.</Muted>
                ) : (
                  <div className="space-y-3">
                    {secondaryContacts.map((contact, i) => (
                      <div key={i} className="flex items-start gap-3 group">
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
                          {contact.email && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 min-w-0">
                              <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                              <a href={`mailto:${contact.email}`} className="truncate hover:text-zinc-900 transition-colors">
                                {contact.email}
                              </a>
                            </div>
                          )}
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                          onClick={() => handleRemoveStakeholder(i)}
                        >
                          <X className="h-3.5 w-3.5 text-zinc-300 hover:text-zinc-900 transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Surface>

              {/* Notes */}
              <Surface className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Muted className="text-[10px] uppercase tracking-widest font-bold">Notes</Muted>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-zinc-500 gap-1"
                    onClick={() => setAddNoteOpen(true)}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                {notes.length === 0 ? (
                  <Muted className="text-xs">No notes yet.</Muted>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note, i) => (
                      <div key={i} className="group relative p-3 bg-zinc-50 rounded-md">
                        <P className="text-xs text-zinc-700 leading-relaxed pr-5">{note}</P>
                        <button
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteNote(i)}
                        >
                          <X className="h-3 w-3 text-zinc-400 hover:text-zinc-900 transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Surface>

            </div>
          </div>
        )}

        {/* ─── Activity Tab ─── */}
        {activeTab === "activity" && (
          <Surface className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <H2 className="text-base">Activity Timeline</H2>
                <Muted className="text-xs">Every interaction with {client.name}.</Muted>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-200 gap-1.5 text-xs"
                onClick={() => setAddNoteOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Log Activity
              </Button>
            </div>
            {timeline.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                </div>
                <Muted className="text-sm">No activity recorded yet.</Muted>
                <Muted className="text-xs mt-1 block">Actions like emails, calls, and system events will appear here.</Muted>
              </div>
            ) : (
              <div className="space-y-5">
                {timeline.map((event, i) => {
                  const Icon = timelineIcons[event.type] ?? AlertCircle;
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <P className="text-sm text-zinc-800 leading-snug">{event.action}</P>
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
          <Surface className="p-8 text-center">
            <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
            </div>
            <Muted className="text-sm">No invoices linked to this client yet.</Muted>
            <Muted className="text-xs mt-1 block">Create an invoice from the Invoices page and link it to this client.</Muted>
            <Link href="/invoices">
              <Button size="sm" variant="outline" className="mt-4 border-zinc-200">
                Go to Invoices
              </Button>
            </Link>
          </Surface>
        )}

        {/* ─── Documents Tab ─── */}
        {activeTab === "documents" && (
          <Surface className="p-8 text-center">
            <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <FileText className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
            </div>
            <Muted className="text-sm">No documents linked to this client yet.</Muted>
            <Muted className="text-xs mt-1 block">Contracts and proposals linked to this client will appear here.</Muted>
            <Link href="/contracts">
              <Button size="sm" variant="outline" className="mt-4 border-zinc-200">
                Go to Contracts
              </Button>
            </Link>
          </Surface>
        )}
      </div>

      {/* ── Overlays ── */}

      {/* Edit client drawer */}
      {editOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[54]" onClick={() => setEditOpen(false)} />
          <EditClientDrawer
            clientId={clientId}
            initialName={client.name}
            initialCompany={client.company_name ?? ""}
            initialEmail={client.email ?? ""}
            initialPhone={client.phone ?? ""}
            initialWebsite={client.website ?? ""}
            initialStatus={status}
            initialHealthScore={client.health_score ?? 0}
            onClose={() => setEditOpen(false)}
          />
        </>
      )}

      {/* Delete confirm */}
      {deleteOpen && (
        <DeleteConfirmModal
          clientName={client.name}
          onConfirm={handleDeleteClient}
          onCancel={() => setDeleteOpen(false)}
          isLoading={deleteClient.isPending}
        />
      )}

      {/* Add note */}
      {addNoteOpen && (
        <AddNoteModal
          onAdd={handleAddNote}
          onClose={() => setAddNoteOpen(false)}
          isLoading={updateMeta.isPending}
        />
      )}

      {/* Add stakeholder */}
      {addStakeholderOpen && (
        <AddStakeholderModal
          onAdd={handleAddStakeholder}
          onClose={() => setAddStakeholderOpen(false)}
          isLoading={updateMeta.isPending}
        />
      )}
    </>
  );
}
