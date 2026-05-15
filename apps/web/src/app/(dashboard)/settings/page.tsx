import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SettingsForm from "./settings-form";

export const metadata: Metadata = {
  title: "Settings | Velluma",
  description: "Manage organization and workspace settings.",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const integrations = (meta.integrations ?? {}) as Record<string, boolean>;

  const fullName =
    (meta.full_name as string) ??
    [meta.first_name, meta.last_name].filter(Boolean).join(" ") ??
    "";

  const branding = (meta.branding ?? {}) as Record<string, string | null>;

  // Workspace identity lives on profiles (queryable, slug-unique). Auth metadata
  // is a fallback only for very-new accounts before the profile insert lands.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "workspace_name, workspace_slug, default_currency, default_timezone, date_format, subscription_tier",
    )
    .eq("id", user.id)
    .maybeSingle();

  const data = {
    email: user.email ?? "",
    workspace: {
      name:
        profile?.workspace_name ??
        (meta.workspace_name as string) ??
        (fullName ? `${fullName}'s Workspace` : "My Workspace"),
      slug: profile?.workspace_slug ?? (meta.workspace_slug as string) ?? "",
      currency: profile?.default_currency ?? (meta.default_currency as string) ?? "USD",
      timezone:
        profile?.default_timezone ??
        (meta.timezone as string) ??
        (typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC"),
      dateFormat:
        profile?.date_format ??
        (meta.date_format as string) ??
        "MMM d, yyyy",
    },
    plan: {
      tier: (profile?.subscription_tier ?? (meta.subscription_tier as string) ?? "free") as
        | "free"
        | "professional"
        | "business",
      renewsAt: (meta.subscription_renews_at as string) ?? null,
    },
    integrations: {
      stripe: Boolean(integrations.stripe),
      googleCalendar: Boolean(integrations.google_calendar),
      slack: Boolean(integrations.slack),
    },
    branding: {
      logoUrl: branding.logo_url ?? null,
      coverUrl: branding.cover_url ?? null,
      accentHex: branding.accent_hex ?? "#18181b",
      tagline: branding.tagline ?? null,
    },
  };

  return <SettingsForm data={data} />;
}
