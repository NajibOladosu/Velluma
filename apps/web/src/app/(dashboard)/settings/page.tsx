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

  const userMeta = user.user_metadata ?? {};
  const fullName = (userMeta.full_name as string) ??
    [userMeta.first_name, userMeta.last_name].filter(Boolean).join(" ") ?? "";

  const workspace = {
    name: (userMeta.workspace_name as string) ?? fullName ? `${fullName}'s Workspace` : "My Workspace",
    slug: (userMeta.workspace_slug as string) ?? "",
    currency: (userMeta.default_currency as string) ?? "USD ($) - United States Dollar",
  };

  return <SettingsForm workspace={workspace} />;
}
