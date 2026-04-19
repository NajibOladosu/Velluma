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

  const data = {
    email: user.email ?? "",
    workspace: {
      name:
        (meta.workspace_name as string) ||
        (fullName ? `${fullName}'s Workspace` : "My Workspace"),
      slug: (meta.workspace_slug as string) ?? "",
      currency: (meta.default_currency as string) ?? "USD",
      timezone:
        (meta.timezone as string) ??
        (typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC"),
      dateFormat: (meta.date_format as string) ?? "MMM d, yyyy",
    },
    plan: {
      tier: ((meta.subscription_tier as string) ?? "free") as
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
