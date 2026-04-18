"use client";

import * as React from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Shield,
  Bell,
  CheckCircle2,
  Loader2,
  KeyRound,
  LogOut,
  AlertCircle,
  Clock,
  FileSignature,
  Receipt,
  MessageSquare,
  Sparkles,
  Mailbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { H1, H3, Muted, P } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import { DetailPageHeader } from "@/components/ui/detail-page-header";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

interface NotificationPrefs {
  proposalActivity: boolean;
  invoicePayments: boolean;
  clientMessages: boolean;
  weeklyDigest: boolean;
  productUpdates: boolean;
}

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  location: string;
  bio: string;
  avatarUrl: string;
  lastSignInAt: string | null;
  createdAt: string | null;
  provider: string;
  notifications: NotificationPrefs;
}

type Section = "personal" | "security" | "notifications";

type FeedbackState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
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

export default function ProfileForm({ profile }: { profile: ProfileData }) {
  const supabase = React.useMemo(() => createClient(), []);

  const [form, setForm] = React.useState(profile);
  const [activeSection, setActiveSection] = React.useState<Section>("personal");
  const [personalState, setPersonalState] = React.useState<FeedbackState>({ kind: "idle" });
  const [securityState, setSecurityState] = React.useState<FeedbackState>({ kind: "idle" });
  const [notifState, setNotifState] = React.useState<FeedbackState>({ kind: "idle" });
  const [signOutLoading, setSignOutLoading] = React.useState(false);

  // Password form
  const [pwCurrent, setPwCurrent] = React.useState("");
  const [pwNew, setPwNew] = React.useState("");
  const [pwConfirm, setPwConfirm] = React.useState("");

  const displayName =
    [form.firstName, form.lastName].filter(Boolean).join(" ") || "Your Name";

  const sections: { key: Section; label: string; icon: React.ElementType; hint: string }[] = [
    { key: "personal", label: "Personal Information", icon: User, hint: "Name, bio, contact" },
    { key: "security", label: "Password & Security", icon: Shield, hint: "Sign-in and password" },
    { key: "notifications", label: "Notifications", icon: Bell, hint: "Email preferences" },
  ];

  async function handleSavePersonal(e: React.FormEvent) {
    e.preventDefault();
    setPersonalState({ kind: "saving" });
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: form.firstName,
        last_name: form.lastName,
        full_name: [form.firstName, form.lastName].filter(Boolean).join(" "),
        job_title: form.jobTitle,
        phone: form.phone,
        location: form.location,
        bio: form.bio,
      },
    });
    if (error) {
      setPersonalState({ kind: "error", message: error.message });
    } else {
      setPersonalState({ kind: "success", message: "Saved" });
      setTimeout(() => setPersonalState({ kind: "idle" }), 2500);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSecurityState({ kind: "idle" });

    if (pwNew.length < 8) {
      setSecurityState({ kind: "error", message: "Password must be at least 8 characters" });
      return;
    }
    if (pwNew !== pwConfirm) {
      setSecurityState({ kind: "error", message: "New passwords do not match" });
      return;
    }

    setSecurityState({ kind: "saving" });

    // Re-authenticate by attempting sign-in with the current password to confirm identity.
    if (profile.provider === "email" && pwCurrent) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: pwCurrent,
      });
      if (signInError) {
        setSecurityState({ kind: "error", message: "Current password is incorrect" });
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) {
      setSecurityState({ kind: "error", message: error.message });
    } else {
      setSecurityState({ kind: "success", message: "Password updated" });
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setTimeout(() => setSecurityState({ kind: "idle" }), 3000);
    }
  }

  async function handleSignOutOthers() {
    setSignOutLoading(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setSignOutLoading(false);
    if (error) {
      setSecurityState({ kind: "error", message: error.message });
    } else {
      setSecurityState({ kind: "success", message: "Other sessions revoked" });
      setTimeout(() => setSecurityState({ kind: "idle" }), 3000);
    }
  }

  async function handleSaveNotifications() {
    setNotifState({ kind: "saving" });
    const { error } = await supabase.auth.updateUser({
      data: {
        notification_preferences: {
          proposal_activity: form.notifications.proposalActivity,
          invoice_payments: form.notifications.invoicePayments,
          client_messages: form.notifications.clientMessages,
          weekly_digest: form.notifications.weeklyDigest,
          product_updates: form.notifications.productUpdates,
        },
      },
    });
    if (error) {
      setNotifState({ kind: "error", message: error.message });
    } else {
      setNotifState({ kind: "success", message: "Preferences saved" });
      setTimeout(() => setNotifState({ kind: "idle" }), 2500);
    }
  }

  function toggleNotif(key: keyof NotificationPrefs) {
    setForm((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  }

  return (
    <div className="space-y-6 pb-20">
      <DetailPageHeader
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        title={<H1 className="text-2xl font-medium truncate min-w-0">Profile</H1>}
        meta={<span className="whitespace-nowrap">Manage your personal information, security, and preferences.</span>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          <Surface className="p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="h-20 w-20 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-9 w-9 text-zinc-400" strokeWidth={1.5} />
                )}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 h-7 w-7 rounded-md border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                title="Avatar upload coming soon"
              >
                <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <P className="text-sm font-medium text-zinc-900 truncate max-w-full">{displayName}</P>
            <Muted className="text-xs truncate max-w-full">{form.jobTitle || "No title set"}</Muted>

            <Separator className="my-4" />

            <div className="w-full space-y-2 text-left">
              <div className="flex items-center gap-2 text-xs text-zinc-600 min-w-0">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" strokeWidth={1.5} />
                <span className="truncate min-w-0">{form.email}</span>
              </div>
              {form.phone && (
                <div className="flex items-center gap-2 text-xs text-zinc-600 min-w-0">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" strokeWidth={1.5} />
                  <span className="truncate min-w-0">{form.phone}</span>
                </div>
              )}
              {form.location && (
                <div className="flex items-center gap-2 text-xs text-zinc-600 min-w-0">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" strokeWidth={1.5} />
                  <span className="truncate min-w-0">{form.location}</span>
                </div>
              )}
            </div>
          </Surface>

          <nav className="space-y-1">
            <div className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
              Sections
            </div>
            {sections.map((s) => {
              const isActive = activeSection === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100/60"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 mt-0.5 flex-shrink-0", isActive ? "text-zinc-900" : "text-zinc-400")}
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.label}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{s.hint}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="min-w-0 space-y-6">
          {activeSection === "personal" && (
            <Surface className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200">
                <H3 className="text-base">Personal Information</H3>
                <Muted className="text-xs">Update your basic profile details.</Muted>
              </div>
              <form onSubmit={handleSavePersonal}>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="First name">
                      <Input
                        value={form.firstName}
                        onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
                      />
                    </Field>
                    <Field label="Last name">
                      <Input
                        value={form.lastName}
                        onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
                      />
                    </Field>
                  </div>

                  <Field label="Email address">
                    <div className="flex items-center gap-3 w-full">
                      <Input value={form.email} disabled className="bg-zinc-50 text-zinc-500" />
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 whitespace-nowrap">
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Verified
                      </span>
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Job title">
                      <Input
                        value={form.jobTitle}
                        onChange={(v) => setForm((p) => ({ ...p, jobTitle: v }))}
                        placeholder="e.g. Product Designer"
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={form.phone}
                        onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                        placeholder="+1 555 000 0000"
                      />
                    </Field>
                  </div>

                  <Field label="Location">
                    <Input
                      value={form.location}
                      onChange={(v) => setForm((p) => ({ ...p, location: v }))}
                      placeholder="City, Country"
                    />
                  </Field>

                  <Field label="Bio" hint="Brief description for your public profile.">
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                      rows={4}
                      placeholder="Tell clients what you do best."
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors resize-y"
                    />
                  </Field>
                </div>
                <div className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-3 flex items-center justify-end gap-3">
                  <Feedback state={personalState} />
                  <Button type="submit" size="sm" className="h-9" disabled={personalState.kind === "saving"}>
                    {personalState.kind === "saving" && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </form>
            </Surface>
          )}

          {activeSection === "security" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Surface>
                <div className="px-6 py-4 border-b border-zinc-200">
                  <H3 className="text-base">Change password</H3>
                  <Muted className="text-xs">
                    {profile.provider === "email"
                      ? "Confirm your current password before setting a new one."
                      : `You signed in via ${profile.provider}. Set a password to enable email sign-in.`}
                  </Muted>
                </div>
                <form onSubmit={handleChangePassword}>
                  <div className="p-6 space-y-5 max-w-md">
                    {profile.provider === "email" && (
                      <Field label="Current password">
                        <Input
                          type="password"
                          value={pwCurrent}
                          onChange={setPwCurrent}
                          autoComplete="current-password"
                        />
                      </Field>
                    )}
                    <Field label="New password" hint="At least 8 characters.">
                      <Input
                        type="password"
                        value={pwNew}
                        onChange={setPwNew}
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label="Confirm new password">
                      <Input
                        type="password"
                        value={pwConfirm}
                        onChange={setPwConfirm}
                        autoComplete="new-password"
                      />
                    </Field>
                  </div>
                  <div className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-3 flex items-center justify-end gap-3">
                    <Feedback state={securityState} />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9"
                      disabled={securityState.kind === "saving" || !pwNew || !pwConfirm}
                    >
                      {securityState.kind === "saving" && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                      <KeyRound className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                      Update password
                    </Button>
                  </div>
                </form>
              </Surface>

              <Surface className="p-6 space-y-4">
                <div>
                  <H3 className="text-base">Sign-in activity</H3>
                  <Muted className="text-xs">Your account details and recent activity.</Muted>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MetaCell icon={Clock} label="Last sign-in" value={formatDateTime(profile.lastSignInAt)} />
                  <MetaCell icon={User} label="Account created" value={formatDateTime(profile.createdAt)} />
                  <MetaCell icon={Shield} label="Sign-in method" value={profile.provider} capitalize />
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <P className="text-sm font-medium">Sign out of all other devices</P>
                    <Muted className="text-xs">Revoke every active session except this one.</Muted>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={handleSignOutOthers}
                    disabled={signOutLoading}
                  >
                    {signOutLoading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                    )}
                    Sign out others
                  </Button>
                </div>
              </Surface>
            </div>
          )}

          {activeSection === "notifications" && (
            <Surface className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200">
                <H3 className="text-base">Email notifications</H3>
                <Muted className="text-xs">Decide what lands in your inbox.</Muted>
              </div>
              <div className="divide-y divide-zinc-100">
                <NotifRow
                  icon={FileSignature}
                  label="Proposal activity"
                  description="When a client views, accepts, or signs a proposal."
                  checked={form.notifications.proposalActivity}
                  onToggle={() => toggleNotif("proposalActivity")}
                />
                <NotifRow
                  icon={Receipt}
                  label="Invoice & payment updates"
                  description="Payment receipts, failed charges, and escrow releases."
                  checked={form.notifications.invoicePayments}
                  onToggle={() => toggleNotif("invoicePayments")}
                />
                <NotifRow
                  icon={MessageSquare}
                  label="Client messages"
                  description="New replies and portal comments from clients."
                  checked={form.notifications.clientMessages}
                  onToggle={() => toggleNotif("clientMessages")}
                />
                <NotifRow
                  icon={Mailbox}
                  label="Weekly digest"
                  description="A Monday summary of pipeline, invoices, and time."
                  checked={form.notifications.weeklyDigest}
                  onToggle={() => toggleNotif("weeklyDigest")}
                />
                <NotifRow
                  icon={Sparkles}
                  label="Product updates"
                  description="New features and improvements, occasionally."
                  checked={form.notifications.productUpdates}
                  onToggle={() => toggleNotif("productUpdates")}
                />
              </div>
              <div className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-3 flex items-center justify-end gap-3">
                <Feedback state={notifState} />
                <Button
                  type="button"
                  size="sm"
                  className="h-9"
                  onClick={handleSaveNotifications}
                  disabled={notifState.kind === "saving"}
                >
                  {notifState.kind === "saving" && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Save preferences
                </Button>
              </div>
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Small building blocks ─────────── */

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
  autoComplete,
  className,
}: {
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      className={cn(
        "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

function MetaCell({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50/50 p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
        <Icon className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </div>
      <div className={cn("mt-1 text-sm font-medium text-zinc-900 truncate", capitalize && "capitalize")}>
        {value}
      </div>
    </div>
  );
}

function NotifRow({
  icon: Icon,
  label,
  description,
  checked,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-zinc-50/50 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-8 w-8 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <P className="text-sm font-medium truncate">{label}</P>
          <Muted className="text-xs">{description}</Muted>
        </div>
      </div>
      <Toggle checked={checked} onChange={onToggle} />
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 mt-0.5",
        checked ? "bg-zinc-900 border-zinc-900" : "bg-zinc-100 border-zinc-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
          "mt-[1px]"
        )}
      />
    </button>
  );
}
