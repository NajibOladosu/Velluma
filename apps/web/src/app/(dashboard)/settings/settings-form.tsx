"use client";

import * as React from "react";
import {
  Briefcase,
  CreditCard,
  Plug,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Calendar,
  MessageSquare,
  Check,
  X,
  Trash2,
  Palette,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { H1, H3, Muted, P } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DetailPageHeader } from "@/components/ui/detail-page-header";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

/* ────────────────── Types ────────────────── */

type PlanTier = "free" | "professional" | "business";
type Section = "workspace" | "branding" | "billing" | "integrations" | "danger";

interface SettingsData {
  email: string;
  workspace: {
    name: string;
    slug: string;
    currency: string;
    timezone: string;
    dateFormat: string;
  };
  plan: {
    tier: PlanTier;
    renewsAt: string | null;
  };
  integrations: {
    stripe: boolean;
    googleCalendar: boolean;
    slack: boolean;
  };
  branding: {
    logoUrl: string | null;
    coverUrl: string | null;
    accentHex: string;
    tagline: string | null;
  };
}

type FeedbackState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

/* ────────────────── Constants ────────────────── */

const CURRENCIES = [
  { value: "USD", label: "USD ($) — US Dollar" },
  { value: "EUR", label: "EUR (€) — Euro" },
  { value: "GBP", label: "GBP (£) — British Pound" },
  { value: "CAD", label: "CAD ($) — Canadian Dollar" },
  { value: "AUD", label: "AUD ($) — Australian Dollar" },
  { value: "NGN", label: "NGN (₦) — Nigerian Naira" },
];

const DATE_FORMATS = [
  { value: "MMM d, yyyy", label: "Mar 14, 2026" },
  { value: "d MMM yyyy", label: "14 Mar 2026" },
  { value: "yyyy-MM-dd", label: "2026-03-14" },
  { value: "MM/dd/yyyy", label: "03/14/2026" },
];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const PLAN_COPY: Record<
  PlanTier,
  { label: string; description: string; price: string; features: string[] }
> = {
  free: {
    label: "Free",
    description: "For solo freelancers just getting started.",
    price: "$0",
    features: ["Up to 3 active clients", "Unlimited proposals", "Basic templates"],
  },
  professional: {
    label: "Professional",
    description: "For full-time freelancers running serious operations.",
    price: "$19",
    features: [
      "Unlimited clients & proposals",
      "Escrow + Stripe Connect",
      "AI contract wizard",
      "Custom branding",
    ],
  },
  business: {
    label: "Business",
    description: "For agencies and teams billing at scale.",
    price: "$49",
    features: [
      "Everything in Professional",
      "Team seats & roles",
      "Priority support",
      "Audit log & SSO",
    ],
  },
};

/* ────────────────── Utility ────────────────── */

function slugify(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

function Feedback({ state }: { state: FeedbackState }) {
  if (state.kind === "idle" || state.kind === "saving") return null;
  const isError = state.kind === "error";
  return (
    <span
      className={cn(
        "text-xs font-medium inline-flex items-center gap-1",
        isError ? "text-red-600" : "text-emerald-600"
      )}
    >
      {isError ? (
        <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      )}
      {state.message}
    </span>
  );
}

/* ────────────────── Main ────────────────── */

export default function SettingsForm({ data }: { data: SettingsData }) {
  const supabase = React.useMemo(() => createClient(), []);

  const [form, setForm] = React.useState(data);
  const [activeSection, setActiveSection] = React.useState<Section>("workspace");
  const [workspaceState, setWorkspaceState] = React.useState<FeedbackState>({ kind: "idle" });
  const [integrationState, setIntegrationState] = React.useState<FeedbackState>({ kind: "idle" });
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(data.workspace.slug));
  const [brandingState, setBrandingState] = React.useState<FeedbackState>({ kind: "idle" });
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [coverUploading, setCoverUploading] = React.useState(false);

  const sections: { key: Section; label: string; icon: React.ElementType; hint: string }[] = [
    { key: "workspace", label: "Workspace", icon: Briefcase, hint: "Name, currency, locale" },
    { key: "branding", label: "Branding", icon: Palette, hint: "Logo, colors, client portal" },
    { key: "billing", label: "Billing & Plan", icon: CreditCard, hint: "Subscription and invoices" },
    { key: "integrations", label: "Integrations", icon: Plug, hint: "Stripe, Calendar, Slack" },
    { key: "danger", label: "Danger Zone", icon: AlertTriangle, hint: "Destructive actions" },
  ];

  async function handleSaveWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setWorkspaceState({ kind: "saving" });
    const { error } = await supabase.auth.updateUser({
      data: {
        workspace_name: form.workspace.name,
        workspace_slug: form.workspace.slug,
        default_currency: form.workspace.currency,
        timezone: form.workspace.timezone,
        date_format: form.workspace.dateFormat,
      },
    });
    if (error) {
      setWorkspaceState({ kind: "error", message: error.message });
    } else {
      setWorkspaceState({ kind: "success", message: "Saved" });
      setTimeout(() => setWorkspaceState({ kind: "idle" }), 2500);
    }
  }

  async function toggleIntegration(key: keyof SettingsData["integrations"]) {
    const next = { ...form.integrations, [key]: !form.integrations[key] };
    setForm((p) => ({ ...p, integrations: next }));
    setIntegrationState({ kind: "saving" });
    const { error } = await supabase.auth.updateUser({
      data: {
        integrations: {
          stripe: next.stripe,
          google_calendar: next.googleCalendar,
          slack: next.slack,
        },
      },
    });
    if (error) {
      setIntegrationState({ kind: "error", message: error.message });
    } else {
      setIntegrationState({ kind: "success", message: "Updated" });
      setTimeout(() => setIntegrationState({ kind: "idle" }), 2000);
    }
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBrandingState({ kind: "saving" });
    const { error } = await supabase.auth.updateUser({
      data: {
        branding: {
          logo_url: form.branding.logoUrl,
          cover_url: form.branding.coverUrl,
          accent_hex: form.branding.accentHex,
          tagline: form.branding.tagline,
        },
      },
    });
    if (error) setBrandingState({ kind: "error", message: error.message });
    else {
      setBrandingState({ kind: "success", message: "Saved" });
      setTimeout(() => setBrandingState({ kind: "idle" }), 2500);
    }
  }

  async function uploadAsset(file: File, kind: "logo" | "cover"): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
    if (error) return null;
    return supabase.storage.from("branding").getPublicUrl(data.path).data.publicUrl;
  }

  async function handleLogoChange(file: File) {
    setLogoUploading(true);
    const url = await uploadAsset(file, "logo");
    setLogoUploading(false);
    if (url) setForm((p) => ({ ...p, branding: { ...p.branding, logoUrl: url } }));
  }

  async function handleCoverChange(file: File) {
    setCoverUploading(true);
    const url = await uploadAsset(file, "cover");
    setCoverUploading(false);
    if (url) setForm((p) => ({ ...p, branding: { ...p.branding, coverUrl: url } }));
  }

  async function handleDeleteWorkspace() {
    if (deleteConfirm !== form.workspace.name) return;
    setDeleting(true);
    // Stub: in production this hits an API to archive the workspace and sign the user out.
    await new Promise((r) => setTimeout(r, 800));
    setDeleting(false);
    setDeleteModalOpen(false);
    setDeleteConfirm("");
  }

  return (
    <div className="space-y-6 pb-20">
      <DetailPageHeader
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        title={<H1 className="text-2xl font-medium truncate min-w-0">Settings</H1>}
        meta={
          <span className="whitespace-nowrap">
            Workspace, billing, integrations, and account controls.
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ── Sidebar ── */}
        <aside className="space-y-1">
          <div className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
            Sections
          </div>
          {sections.map((s) => {
            const isActive = activeSection === s.key;
            const Icon = s.icon;
            const isDanger = s.key === "danger";
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSection(s.key)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                  isActive
                    ? isDanger
                      ? "bg-red-50 text-red-700"
                      : "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100/60"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 mt-0.5 flex-shrink-0",
                    isActive
                      ? isDanger
                        ? "text-red-600"
                        : "text-zinc-900"
                      : "text-zinc-400"
                  )}
                  strokeWidth={1.5}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.label}</div>
                  <div
                    className={cn(
                      "text-[11px] truncate",
                      isActive && isDanger ? "text-red-500" : "text-zinc-500"
                    )}
                  >
                    {s.hint}
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── Content ── */}
        <div className="min-w-0 space-y-6">
          {activeSection === "workspace" && (
            <Surface className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200">
                <H3 className="text-base">Workspace</H3>
                <Muted className="text-xs">
                  Shown on proposals, invoices, and the client portal.
                </Muted>
              </div>
              <form onSubmit={handleSaveWorkspace}>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Workspace name">
                      <Input
                        value={form.workspace.name}
                        onChange={(v) => {
                          setForm((p) => ({
                            ...p,
                            workspace: {
                              ...p.workspace,
                              name: v,
                              slug: slugTouched ? p.workspace.slug : slugify(v),
                            },
                          }));
                        }}
                      />
                    </Field>
                    <Field
                      label="URL slug"
                      hint={
                        form.workspace.slug
                          ? `velluma.app/w/${form.workspace.slug}`
                          : "Used in client-facing links."
                      }
                    >
                      <Input
                        value={form.workspace.slug}
                        onChange={(v) => {
                          setSlugTouched(true);
                          setForm((p) => ({
                            ...p,
                            workspace: { ...p.workspace, slug: slugify(v) },
                          }));
                        }}
                        placeholder="your-workspace"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Default currency">
                      <Select
                        value={form.workspace.currency}
                        onChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            workspace: { ...p.workspace, currency: v },
                          }))
                        }
                        options={CURRENCIES}
                      />
                    </Field>
                    <Field label="Timezone">
                      <Select
                        value={form.workspace.timezone}
                        onChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            workspace: { ...p.workspace, timezone: v },
                          }))
                        }
                        options={COMMON_TIMEZONES.map((t) => ({ value: t, label: t }))}
                      />
                    </Field>
                  </div>

                  <Field label="Date format">
                    <Select
                      value={form.workspace.dateFormat}
                      onChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          workspace: { ...p.workspace, dateFormat: v },
                        }))
                      }
                      options={DATE_FORMATS}
                    />
                  </Field>
                </div>
                <div className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-3 flex items-center justify-end gap-3">
                  <Feedback state={workspaceState} />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9"
                    disabled={workspaceState.kind === "saving"}
                  >
                    {workspaceState.kind === "saving" && (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    )}
                    Save changes
                  </Button>
                </div>
              </form>
            </Surface>
          )}

          {activeSection === "branding" && (
            <Surface className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200">
                <H3 className="text-base">Branding</H3>
                <Muted className="text-xs">Personalize the client portal. Seen by clients on <code className="font-mono text-zinc-700">/portal</code> and share links.</Muted>
              </div>
              <form onSubmit={handleSaveBranding}>
                <div className="p-6 space-y-6">
                  {/* Cover preview */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-700">Cover image</label>
                    <div
                      className="relative h-32 w-full rounded-md border border-zinc-200 overflow-hidden bg-zinc-100 flex items-center justify-center"
                      style={{
                        backgroundImage: form.branding.coverUrl ? `url(${form.branding.coverUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {!form.branding.coverUrl && (
                        <div className="flex flex-col items-center gap-1 text-zinc-400">
                          <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                          <span className="text-xs">No cover uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors">
                        {coverUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        {form.branding.coverUrl ? "Replace" : "Upload cover"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverChange(f) }} />
                      </label>
                      {form.branding.coverUrl && (
                        <button type="button"
                          className="h-8 px-3 text-xs text-zinc-500 hover:text-red-600 transition-colors"
                          onClick={() => setForm((p) => ({ ...p, branding: { ...p.branding, coverUrl: null } }))}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logo */}
                  <div className="grid grid-cols-[80px_1fr] gap-4 items-start">
                    <div className="h-20 w-20 rounded-md border border-zinc-200 bg-white overflow-hidden flex items-center justify-center">
                      {form.branding.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.branding.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-zinc-700">Logo</label>
                      <Muted className="text-xs block">PNG, JPG, SVG, or WebP. Square works best.</Muted>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors">
                          {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          {form.branding.logoUrl ? "Replace" : "Upload logo"}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="sr-only"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoChange(f) }} />
                        </label>
                        {form.branding.logoUrl && (
                          <button type="button" className="h-8 px-3 text-xs text-zinc-500 hover:text-red-600 transition-colors"
                            onClick={() => setForm((p) => ({ ...p, branding: { ...p.branding, logoUrl: null } }))}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accent color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-700">Accent color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.branding.accentHex}
                          onChange={(e) => setForm((p) => ({ ...p, branding: { ...p.branding, accentHex: e.target.value } }))}
                          className="h-10 w-14 rounded-md border border-zinc-200 bg-white cursor-pointer" />
                        <input type="text" value={form.branding.accentHex}
                          onChange={(e) => setForm((p) => ({ ...p, branding: { ...p.branding, accentHex: e.target.value } }))}
                          className="flex h-10 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
                      </div>
                      <Muted className="text-[11px]">Used for CTAs and highlights on the client portal.</Muted>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-700">Tagline (optional)</label>
                      <input type="text" value={form.branding.tagline ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, branding: { ...p.branding, tagline: e.target.value || null } }))}
                        placeholder="Secure project workspace."
                        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" />
                    </div>
                  </div>
                </div>
                <div className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-3 flex items-center justify-end gap-3">
                  <Feedback state={brandingState} />
                  <Button type="submit" size="sm" className="h-9" disabled={brandingState.kind === "saving"}>
                    {brandingState.kind === "saving" && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                    Save branding
                  </Button>
                </div>
              </form>
            </Surface>
          )}

          {activeSection === "billing" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Surface className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <H3 className="text-base">{PLAN_COPY[form.plan.tier].label} plan</H3>
                      <Badge
                        variant={form.plan.tier === "free" ? "outline" : "emerald"}
                        className="uppercase text-[10px]"
                      >
                        {form.plan.tier === "free" ? "Current" : "Active"}
                      </Badge>
                    </div>
                    <Muted className="text-xs mt-0.5">
                      {PLAN_COPY[form.plan.tier].description}
                    </Muted>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-semibold text-zinc-900 tracking-tight">
                      {PLAN_COPY[form.plan.tier].price}
                      <span className="text-sm font-normal text-zinc-500">/mo</span>
                    </div>
                    {form.plan.renewsAt && (
                      <Muted className="text-[11px]">
                        Renews {new Date(form.plan.renewsAt).toLocaleDateString()}
                      </Muted>
                    )}
                  </div>
                </div>

                <Separator />

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PLAN_COPY[form.plan.tier].features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-700">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2 flex-wrap">
                  {form.plan.tier !== "business" && (
                    <Button size="sm" className="h-9">
                      <Sparkles className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                      {form.plan.tier === "free" ? "Upgrade plan" : "Upgrade to Business"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-9">
                    <ExternalLink className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                    View invoices
                  </Button>
                </div>
              </Surface>

              <Surface className="p-6 space-y-4">
                <div>
                  <H3 className="text-base">Payment method</H3>
                  <Muted className="text-xs">Card on file for subscription billing.</Muted>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 bg-zinc-50/50 p-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-12 rounded-md bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                      <CreditCard className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <P className="text-sm font-medium">No card on file</P>
                      <Muted className="text-xs">Add a card to upgrade.</Muted>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 shrink-0">
                    Add card
                  </Button>
                </div>
              </Surface>
            </div>
          )}

          {activeSection === "integrations" && (
            <Surface className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <H3 className="text-base">Integrations</H3>
                  <Muted className="text-xs">Extend Velluma with the tools you already use.</Muted>
                </div>
                <Feedback state={integrationState} />
              </div>
              <div className="divide-y divide-zinc-100">
                <IntegrationRow
                  icon={CreditCard}
                  name="Stripe"
                  description="Accept payments and escrow milestones via Stripe Connect."
                  connected={form.integrations.stripe}
                  onToggle={() => toggleIntegration("stripe")}
                  docsHref="/finance"
                />
                <IntegrationRow
                  icon={Calendar}
                  name="Google Calendar"
                  description="Sync project deadlines and client meetings to your calendar."
                  connected={form.integrations.googleCalendar}
                  onToggle={() => toggleIntegration("googleCalendar")}
                />
                <IntegrationRow
                  icon={MessageSquare}
                  name="Slack"
                  description="Get proposal activity and payment pings in a channel."
                  connected={form.integrations.slack}
                  onToggle={() => toggleIntegration("slack")}
                />
              </div>
            </Surface>
          )}

          {activeSection === "danger" && (
            <Surface className="border-red-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-6 py-4 border-b border-red-200 bg-red-50/50">
                <H3 className="text-base text-red-700">Danger zone</H3>
                <Muted className="text-xs text-red-600/80">
                  These actions are permanent and cannot be undone.
                </Muted>
              </div>
              <div className="divide-y divide-zinc-100">
                <div className="flex items-start justify-between gap-4 p-6 flex-wrap">
                  <div className="min-w-0">
                    <P className="text-sm font-medium">Transfer workspace ownership</P>
                    <Muted className="text-xs">
                      Hand off this workspace to another member. Requires at least one other admin.
                    </Muted>
                  </div>
                  <Button variant="outline" size="sm" className="h-9 shrink-0" disabled>
                    Transfer
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 p-6 flex-wrap">
                  <div className="min-w-0">
                    <P className="text-sm font-medium text-red-700">Delete workspace</P>
                    <Muted className="text-xs">
                      Permanently remove{" "}
                      <span className="font-medium text-zinc-700">{form.workspace.name}</span> and all
                      associated data.
                    </Muted>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                    Delete workspace
                  </Button>
                </div>
              </div>
            </Surface>
          )}
        </div>
      </div>

      {/* ── Delete confirm modal ── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => !deleting && setDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <H3 className="text-base">Delete workspace</H3>
                <Muted className="text-xs mt-1">
                  This will permanently delete{" "}
                  <span className="font-medium text-zinc-700">{form.workspace.name}</span>, all
                  contracts, clients, and files. This cannot be undone.
                </Muted>
              </div>
              <button
                type="button"
                onClick={() => !deleting && setDeleteModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <Field label={`Type "${form.workspace.name}" to confirm`}>
              <Input
                value={deleteConfirm}
                onChange={setDeleteConfirm}
                placeholder={form.workspace.name}
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteWorkspace}
                disabled={deleting || deleteConfirm !== form.workspace.name}
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────── Small building blocks ────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500",
        className
      )}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function IntegrationRow({
  icon: Icon,
  name,
  description,
  connected,
  onToggle,
  docsHref,
}: {
  icon: React.ElementType;
  name: string;
  description: string;
  connected: boolean;
  onToggle: () => void;
  docsHref?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-10 w-10 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <P className="text-sm font-medium">{name}</P>
            <Badge
              variant={connected ? "emerald" : "outline"}
              className="text-[10px] uppercase tracking-wide"
            >
              {connected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <Muted className="text-xs">{description}</Muted>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {docsHref && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <a href={docsHref}>
              Manage
              <ExternalLink className="h-3 w-3 ml-1" strokeWidth={1.5} />
            </a>
          </Button>
        )}
        <Button
          variant={connected ? "outline" : "default"}
          size="sm"
          className="h-8"
          onClick={onToggle}
        >
          {connected ? "Disconnect" : "Connect"}
        </Button>
      </div>
    </div>
  );
}
