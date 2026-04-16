"use client";

import * as React from "react";
import { H1, Muted } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Plus,
  Search,
  Tag,
  X,
  ArrowUpRight,
  User,
  Users,
  DollarSign,
  Heart,
  TrendingUp,
  Bot,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useClients, useCreateClient, type ClientRow } from "@/lib/queries/clients";

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function getClientStatus(client: ClientRow): "active" | "lead" | "past" {
  const meta = client.metadata as Record<string, unknown> | null;
  const raw = meta?.status;
  if (raw === "active" || raw === "lead" || raw === "past") return raw;
  return "active";
}

function formatRevenue(client: ClientRow): string {
  const meta = client.metadata as Record<string, unknown> | null;
  const rev = Number(meta?.total_revenue ?? 0);
  return rev === 0 ? "$0" : `$${rev.toLocaleString()}`;
}

const ALL_TAGS = [
  "Enterprise", "VIP", "Startup", "FinTech", "HealthTech",
  "E-commerce", "DevTools", "SaaS", "AI", "Marketing",
  "Media", "Branding", "VC", "Retainer",
];

type StatusTab = "all" | "active" | "lead" | "past";

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function ClientMetrics({ clients }: { clients: ClientRow[] }) {
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => getClientStatus(c) === "active").length;
  const lifetimeRevenue = clients.reduce((s, c) => {
    const rev = Number((c.metadata as Record<string, unknown> | null)?.total_revenue ?? 0);
    return s + rev;
  }, 0);
  const avgHealth =
    totalClients > 0
      ? Math.round(clients.reduce((s, c) => s + (c.health_score ?? 0), 0) / totalClients)
      : 0;

  const metrics = [
    { label: "Total Clients",    value: totalClients.toString(),               sub: `${clients.filter((c) => getClientStatus(c) === "lead").length} leads`, icon: Users },
    { label: "Active",           value: activeClients.toString(),              sub: "Currently engaged",   icon: TrendingUp },
    { label: "Lifetime Revenue", value: `$${lifetimeRevenue.toLocaleString()}`, sub: "All-time earnings",  icon: DollarSign },
    { label: "Avg Health Score", value: avgHealth.toString(),                  sub: "Relationship health", icon: Heart },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {metrics.map((m) => (
        <Surface key={m.label} className="p-5 flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">{m.label}</Muted>
            <m.icon className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">{m.value}</div>
          <Muted className="text-[10px] mt-1 truncate block">{m.sub}</Muted>
        </Surface>
      ))}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Surface key={i} className="p-5 animate-pulse">
          <div className="h-3 w-24 rounded bg-zinc-100 mb-3" />
          <div className="h-8 w-16 rounded bg-zinc-100 mb-2" />
          <div className="h-2 w-20 rounded bg-zinc-50" />
        </Surface>
      ))}
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
      {tag}
    </span>
  );
}

function AddClientDrawer({ onClose }: { onClose: () => void }) {
  const createClient = useCreateClient();
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [source, setSource] = React.useState("Manual Entry");
  const [status, setStatus] = React.useState<"active" | "lead" | "past">("lead");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createClient.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company_name: company.trim() || undefined,
        website: website.trim() || undefined,
        source: source.trim() || "Manual Entry",
        status,
      });
      onClose();
    } catch {
      // Error displayed in the form via createClient.error
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">New Client</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Full Name *",  placeholder: "e.g. David Frost",        value: name,    onChange: setName },
            { label: "Company",      placeholder: "e.g. Acme Corp",          value: company, onChange: setCompany },
            { label: "Email",        placeholder: "e.g. david@acme.co",      value: email,   onChange: setEmail },
            { label: "Phone",        placeholder: "e.g. +1 (415) 555-0199",  value: phone,   onChange: setPhone },
            { label: "Website",      placeholder: "e.g. https://acme.co",    value: website, onChange: setWebsite },
            { label: "Lead Source",  placeholder: "e.g. Referral, LinkedIn", value: source,  onChange: setSource },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                {field.label}
              </label>
              <Input
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-9 bg-white border-zinc-200 text-sm"
              />
            </div>
          ))}

          {/* Status */}
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

          {createClient.error && (
            <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-500" />
              {(createClient.error as Error).message}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-zinc-200" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 font-semibold" disabled={!name.trim() || createClient.isPending}>
              {createClient.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Create Client
            </Button>
          </div>
        </form>

        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-zinc-100 flex items-center justify-center">
            <Bot className="h-3 w-3 text-zinc-400" />
          </div>
          <Muted className="text-[10px] uppercase tracking-widest">AI will auto-enrich profile after creation</Muted>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function ClientsPage() {
  const [searchQuery,   setSearchQuery]   = React.useState("");
  const [statusTab,     setStatusTab]     = React.useState<StatusTab>("all");
  const [tagFilter,     setTagFilter]     = React.useState("all");
  const [tagFilterOpen, setTagFilterOpen] = React.useState(false);
  const [addClientOpen, setAddClientOpen] = React.useState(false);

  const { data: clients = [], isLoading, isError, error, refetch } = useClients();

  // Close tag dropdown on outside click
  React.useEffect(() => {
    const handler = () => setTagFilterOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = React.useMemo(() => {
    return clients.filter((c) => {
      const status = getClientStatus(c);
      const matchesSearch =
        searchQuery === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusTab === "all" || status === statusTab;
      const matchesTag    = tagFilter === "all" || (c.tags ?? []).includes(tagFilter);
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [clients, searchQuery, statusTab, tagFilter]);

  const statusCounts = {
    all:    clients.length,
    active: clients.filter((c) => getClientStatus(c) === "active").length,
    lead:   clients.filter((c) => getClientStatus(c) === "lead").length,
    past:   clients.filter((c) => getClientStatus(c) === "past").length,
  };

  const statusLabel: Record<string, string> = { active: "Active", lead: "Lead", past: "Past" };
  const tabs: StatusTab[] = ["all", "active", "lead", "past"];

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <H1 className="truncate">Clients</H1>
            <Muted className="truncate block">
              {isLoading ? "Loading…" : `${clients.length} contacts in your rolodex.`}
            </Muted>
          </div>
          <Button className="font-semibold px-4 sm:px-5 gap-2 shrink-0 w-full sm:w-auto" onClick={() => setAddClientOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add Client
          </Button>
        </div>

        {/* Metrics */}
        {isLoading ? <MetricsSkeleton /> : <ClientMetrics clients={clients} />}

        {/* Error banner */}
        {isError && (
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-zinc-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">Failed to load clients</p>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{(error as Error)?.message}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-200 shrink-0" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Tabs + Search + Tag Filter */}
        <div className="space-y-4">
          {/* Status Tabs */}
          <div className="overflow-x-auto">
            <div className="flex items-center gap-1 border-b border-zinc-200 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    "px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap",
                    statusTab === tab
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-400 hover:text-zinc-600"
                  )}
                  onClick={() => setStatusTab(tab)}
                >
                  {tab === "all" ? "All" : statusLabel[tab] ?? tab}{" "}
                  <span className={cn("ml-1 text-[10px]", statusTab === tab ? "text-zinc-900" : "text-zinc-400")}>
                    {statusCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search + Tag Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white border-zinc-200 text-sm focus:ring-0"
              />
            </div>

            <div className="relative w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-9 w-full sm:w-auto border-zinc-200 gap-1.5", tagFilter !== "all" && "border-zinc-900")}
                onClick={() => setTagFilterOpen(!tagFilterOpen)}
              >
                <Tag className="h-3.5 w-3.5" />
                Tag{tagFilter !== "all" ? `: ${tagFilter}` : ""}
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </Button>
              {tagFilterOpen && (
                <div className="absolute left-0 top-11 z-50 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                  <button
                    className={cn("w-full px-3 py-2 text-left text-xs hover:bg-zinc-50", tagFilter === "all" && "font-bold text-zinc-900")}
                    onClick={() => { setTagFilter("all"); setTagFilterOpen(false); }}
                  >
                    All Tags
                  </button>
                  {ALL_TAGS.map((t) => (
                    <button
                      key={t}
                      className={cn("w-full px-3 py-2 text-left text-xs hover:bg-zinc-50", tagFilter === t && "font-bold text-zinc-900")}
                      onClick={() => { setTagFilter(t); setTagFilterOpen(false); }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(searchQuery || statusTab !== "all" || tagFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-zinc-500 gap-1"
                onClick={() => { setSearchQuery(""); setStatusTab("all"); setTagFilter("all"); }}
              >
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Client Table */}
        <Surface className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Client</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden sm:table-cell">Health</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">Revenue</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden lg:table-cell">Tags</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {/* Loading skeleton rows */}
                {isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-zinc-100" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 rounded bg-zinc-100" />
                            <div className="h-2 w-20 rounded bg-zinc-50" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><div className="h-3 w-16 rounded bg-zinc-100" /></td>
                      <td className="px-4 py-4 hidden sm:table-cell"><div className="h-3 w-16 rounded bg-zinc-100" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><div className="h-3 w-16 rounded bg-zinc-100" /></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3 w-16 rounded bg-zinc-100" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-16 rounded bg-zinc-100" /></td>
                    </tr>
                  ))}

                {/* Empty state */}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                        </div>
                        <Muted className="text-sm">
                          {clients.length === 0
                            ? "No clients yet. Add your first client to get started."
                            : "No clients match your filters."}
                        </Muted>
                        {clients.length === 0 && (
                          <Button size="sm" className="mt-1" onClick={() => setAddClientOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Client
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!isLoading &&
                  filtered.map((client) => {
                    const status = getClientStatus(client);
                    return (
                      <Link key={client.id} href={`/clients/${client.id}`} className="contents">
                        <tr className="group hover:bg-zinc-50/50 transition-colors cursor-pointer">
                          <td className="px-4 py-4 max-w-[200px]">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-zinc-900 tracking-tight truncate block max-w-[150px] sm:max-w-[200px]">{client.name}</span>
                                {client.company_name && (
                                  <div className="text-xs text-zinc-500 truncate block max-w-[150px] sm:max-w-[200px]">{client.company_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium capitalize shrink-0">
                              {statusLabel[status] ?? status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900 text-sm shrink-0">{client.health_score ?? "—"}</span>
                              {client.health_score != null && (
                                <div className="w-12 h-[3px] bg-zinc-100 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${client.health_score}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <div className="font-medium text-zinc-900 truncate">{formatRevenue(client)}</div>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(client.tags ?? []).slice(0, 2).map((tag) => (
                                <TagBadge key={tag} tag={tag} />
                              ))}
                              {(client.tags ?? []).length > 2 && (
                                <span className="text-[10px] text-zinc-400 font-medium self-center">
                                  +{(client.tags ?? []).length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-zinc-400 shrink-0 whitespace-nowrap">
                                {new Date(client.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                          </td>
                        </tr>
                      </Link>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      {/* Add Client Drawer */}
      {addClientOpen && (
        <>
          <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setAddClientOpen(false)} />
          <AddClientDrawer onClose={() => setAddClientOpen(false)} />
        </>
      )}
    </>
  );
}
