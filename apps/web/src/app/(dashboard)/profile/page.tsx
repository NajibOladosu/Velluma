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

  const userMeta = user.user_metadata ?? {};

  const profile = {
    email: user.email ?? "",
    firstName: (userMeta.first_name as string) ?? (userMeta.full_name as string)?.split(" ")[0] ?? "",
    lastName: (userMeta.last_name as string) ?? (userMeta.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
    jobTitle: (userMeta.job_title as string) ?? "",
    phone: (userMeta.phone as string) ?? user.phone ?? "",
    location: (userMeta.location as string) ?? "",
    bio: (userMeta.bio as string) ?? "",
    avatarUrl: (userMeta.avatar_url as string) ?? "",
  };

  return <ProfileForm profile={profile} />;
}
