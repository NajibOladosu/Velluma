"use client";

import * as React from "react";
import { Building2, Palette, CreditCard, Plug, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface WorkspaceData {
  name: string;
  slug: string;
  currency: string;
}

const CURRENCIES = [
  "USD ($) - United States Dollar",
  "EUR (€) - Euro",
  "GBP (£) - British Pound",
  "CAD ($) - Canadian Dollar",
];

export default function SettingsForm({ workspace }: { workspace: WorkspaceData }) {
  const [form, setForm] = React.useState(workspace);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<"general" | "branding" | "billing" | "integrations">("general");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: {
          workspace_name: form.name,
          workspace_slug: form.slug,
          default_currency: form.currency,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error silently handled
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
            <h1 className="text-2xl font-medium truncate min-w-0">Settings</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <span className="flex items-center gap-1.5 text-sm text-zinc-500 whitespace-nowrap">
              Manage your workspace, billing, and team configuration.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column - Navigation */}
        <div className="lg:col-span-1">
          <nav className="flex flex-col space-y-1 sticky top-6">
            {([
              { key: "general" as const, label: "General", icon: Building2 },
              { key: "branding" as const, label: "Branding", icon: Palette },
              { key: "billing" as const, label: "Billing & Plans", icon: CreditCard },
              { key: "integrations" as const, label: "Integrations", icon: Plug },
            ]).map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === item.key
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-3 space-y-8 min-w-0">

          {/* Section: Workspace Settings */}
          <section className="space-y-4 min-w-0">
            <div>
              <h2 className="text-lg font-medium text-zinc-900">Workspace Settings</h2>
              <p className="text-sm text-zinc-500">Manage your organization&apos;s core details.</p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white">
              <form onSubmit={handleSave}>
                <div className="p-6 space-y-6">
                  <div className="space-y-4 min-w-0">
                    <div className="space-y-2 min-w-0">
                      <label htmlFor="workspaceName" className="block text-sm font-medium text-zinc-700">Workspace Name</label>
                      <input
                        type="text"
                        id="workspaceName"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="flex h-10 w-full max-w-md rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
                      />
                    </div>

                    <div className="space-y-2 min-w-0">
                      <label htmlFor="workspaceUrl" className="block text-sm font-medium text-zinc-700">Workspace URL</label>
                      <div className="flex max-w-md rounded-md">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-200 bg-zinc-50 text-zinc-500 sm:text-sm">
                          velluma.com/
                        </span>
                        <input
                          type="text"
                          id="workspaceUrl"
                          value={form.slug}
                          onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                          placeholder="your-workspace"
                          className="flex-1 block w-full min-w-0 rounded-none rounded-r-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 space-y-4">
                    <div className="space-y-2 min-w-0">
                      <label htmlFor="currency" className="block text-sm font-medium text-zinc-700">Default Currency</label>
                      <select
                        id="currency"
                        value={form.currency}
                        onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                        className="flex h-10 w-full max-w-xs rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <p className="text-xs text-zinc-500 mt-1">This currency will be used as default for new proposals and invoices.</p>
                    </div>
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
                    Save Configuration
                  </Button>
                </div>
              </form>
            </div>
          </section>

          {/* Section: Danger Zone */}
          <section className="space-y-4 min-w-0 pt-8 mt-8 border-t border-zinc-200">
            <div>
              <h2 className="text-lg font-medium text-red-600">Danger Zone</h2>
              <p className="text-sm text-zinc-500">Irreversible destructive actions.</p>
            </div>

            <div className="rounded-lg border border-red-200 bg-white overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-medium text-zinc-900">Delete Workspace</h3>
                    <p className="text-sm text-zinc-500">Permanently delete this workspace and all of its data. This cannot be undone.</p>
                  </div>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-shrink-0">
                    Delete Workspace
                  </Button>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
