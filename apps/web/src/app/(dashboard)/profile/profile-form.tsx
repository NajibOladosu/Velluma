"use client";

import * as React from "react";
import { User, Mail, Phone, MapPin, Camera, Shield, Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  location: string;
  bio: string;
  avatarUrl: string;
}

export default function ProfileForm({ profile }: { profile: ProfileData }) {
  const [form, setForm] = React.useState(profile);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<"personal" | "security" | "notifications">("personal");

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "Your Name";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silently fail — user will see no confirmation
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl font-medium truncate min-w-0">Profile</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <span className="flex items-center gap-1.5 text-sm text-zinc-500 whitespace-nowrap">
              Manage your personal information and security.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-900 overflow-hidden">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-zinc-400" strokeWidth={1.5} />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-md border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors">
                  <Camera className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <h2 className="text-lg font-medium text-zinc-900 truncate min-w-0 max-w-full">{displayName}</h2>
              <p className="text-sm text-zinc-500 truncate min-w-0 max-w-full">{form.jobTitle || "No title set"}</p>

              <div className="mt-6 w-full space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-600 min-w-0 w-full">
                  <Mail className="h-4 w-4 flex-shrink-0 text-zinc-400" strokeWidth={1.5} />
                  <span className="truncate min-w-0">{profile.email}</span>
                </div>
                {form.phone && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600 min-w-0 w-full">
                    <Phone className="h-4 w-4 flex-shrink-0 text-zinc-400" strokeWidth={1.5} />
                    <span className="truncate min-w-0">{form.phone}</span>
                  </div>
                )}
                {form.location && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600 min-w-0 w-full">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-zinc-400" strokeWidth={1.5} />
                    <span className="truncate min-w-0">{form.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-2">
            <nav className="flex flex-col space-y-1">
              {([
                { key: "personal" as const, label: "Personal Information", icon: User },
                { key: "security" as const, label: "Password & Security", icon: Shield },
                { key: "notifications" as const, label: "Notifications", icon: Bell },
              ]).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === item.key
                      ? "bg-zinc-50 text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.5} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-6 py-4">
              <h3 className="text-base font-medium text-zinc-900">Personal Information</h3>
              <p className="text-sm text-zinc-500 mt-1">Update your basic profile details.</p>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">
                  <div className="space-y-2 min-w-0">
                    <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2 min-w-0">
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-700">Email Address</label>
                  <div className="flex items-center gap-3 w-full">
                    <input
                      type="email"
                      id="email"
                      value={profile.email}
                      disabled
                      className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed transition-colors"
                    />
                    <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 whitespace-nowrap">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  </div>
                </div>

                <div className="space-y-2 min-w-0">
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-zinc-700">Job Title</label>
                  <input
                    type="text"
                    id="jobTitle"
                    value={form.jobTitle}
                    onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                    placeholder="e.g. Product Designer"
                    className="flex h-10 w-full max-w-md rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
                  />
                </div>

                <div className="space-y-2 min-w-0">
                  <label htmlFor="bio" className="block text-sm font-medium text-zinc-700">Bio</label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="A brief description for your public profile."
                    className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors resize-y"
                  />
                  <p className="text-xs text-zinc-500">Brief description for your public profile. URLs are hyperlinked.</p>
                </div>
              </div>
              <div className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-4 flex items-center justify-end gap-3">
                {saved && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800 h-9 px-4" disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
