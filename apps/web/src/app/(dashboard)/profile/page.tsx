import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProfileForm from "./profile-form";

export const metadata: Metadata = {
  title: "Profile | Velluma",
  description: "Manage your personal profile and preferences.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const notifs = (meta.notification_preferences ?? {}) as Record<string, boolean>;

  const profile = {
    email: user.email ?? "",
    firstName: (meta.first_name as string) ?? (meta.full_name as string)?.split(" ")[0] ?? "",
    lastName: (meta.last_name as string) ?? (meta.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
    jobTitle: (meta.job_title as string) ?? "",
    phone: (meta.phone as string) ?? user.phone ?? "",
    location: (meta.location as string) ?? "",
    bio: (meta.bio as string) ?? "",
    avatarUrl: (meta.avatar_url as string) ?? "",
    lastSignInAt: user.last_sign_in_at ?? null,
    createdAt: user.created_at ?? null,
    provider: (user.app_metadata?.provider as string) ?? "email",
    notifications: {
      proposalActivity: notifs.proposal_activity ?? true,
      invoicePayments: notifs.invoice_payments ?? true,
      clientMessages: notifs.client_messages ?? true,
      weeklyDigest: notifs.weekly_digest ?? false,
      productUpdates: notifs.product_updates ?? false,
    },
  };

  return <ProfileForm profile={profile} />;
}
