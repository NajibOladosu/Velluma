"use client";

import * as React from "react";
import { H1, Muted, P } from "@/components/ui/typography";
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
  Mail,
  Phone,
  Bot,
  Calendar,
  Briefcase,
  PenLine,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

export interface ClientRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  status: "active" | "lead" | "past";
  healthScore: number;
  totalRevenue: number;
  revenueDisplay: string;
  activeProjects: number;
  completedProjects: number;
  lastInteraction: string;
  tags: string[];
  source: string;
  createdAt: string;
  enrichment: {
    linkedin: string;
    twitter: string;
    companySize: string;
    industry: string;
    confidence: number;
  };
}

/* ═══════════════════════════════════════════════════════
   MOCK DATA (shared with [id] page)
   ═══════════════════════════════════════════════════════ */

export const clientsData: ClientRecord[] = [
  {
    id: "1", name: "David Frost", company: "Acme Corp", email: "david@acme.co", phone: "+1 (415) 555-0199", website: "acme.co",
    status: "active", healthScore: 92, totalRevenue: 42500, revenueDisplay: "$42,500", activeProjects: 1, completedProjects: 2,
    lastInteraction: "2h ago", tags: ["Enterprise", "VIP", "E-commerce"], source: "Returning Client", createdAt: "Jan 15",
    enrichment: { linkedin: "linkedin.com/in/davidfrost", twitter: "@davidfrost_ceo", companySize: "200-1000", industry: "E-commerce", confidence: 99 },
  },
  {
    id: "2", name: "James Liu", company: "Terra Finance", email: "james@terra.io", phone: "+1 (646) 555-0133", website: "terra.io",
    status: "active", healthScore: 88, totalRevenue: 22000, revenueDisplay: "$22,000", activeProjects: 1, completedProjects: 0,
    lastInteraction: "30m ago", tags: ["Enterprise", "FinTech", "Retainer"], source: "Conference", createdAt: "Feb 10",
    enrichment: { linkedin: "linkedin.com/in/jamesliu", twitter: "@jamesliu_cfo", companySize: "1000+", industry: "Financial Services", confidence: 98 },
  },
  {
    id: "3", name: "Maria Santos", company: "Orbit Systems", email: "maria@orbit.dev", phone: "+1 (512) 555-0177", website: "orbit.dev",
    status: "active", healthScore: 76, totalRevenue: 9800, revenueDisplay: "$9,800", activeProjects: 2, completedProjects: 0,
    lastInteraction: "1h ago", tags: ["DevTools", "Startup"], source: "Referral", createdAt: "Feb 15",
    enrichment: { linkedin: "linkedin.com/in/mariasantos", twitter: "@mariasantos", companySize: "50-200", industry: "DevTools", confidence: 91 },
  },
  {
    id: "4", name: "Lena Park", company: "Orion Health", email: "lena@orion.health", phone: "+1 (617) 555-0199", website: "orion.health",
    status: "lead", healthScore: 45, totalRevenue: 0, revenueDisplay: "$0", activeProjects: 0, completedProjects: 0,
    lastInteraction: "1d ago", tags: ["HealthTech", "Enterprise"], source: "Website Form", createdAt: "Mar 01",
    enrichment: { linkedin: "linkedin.com/in/lenapark", twitter: "@lenapark_cto", companySize: "200-1000", industry: "HealthTech", confidence: 97 },
  },
  {
    id: "5", name: "Tom Ashford", company: "Starlight Digital", email: "tom@starlight.co", phone: "+1 (310) 555-0144", website: "starlight.co",
    status: "lead", healthScore: 38, totalRevenue: 0, revenueDisplay: "$0", activeProjects: 0, completedProjects: 0,
    lastInteraction: "3d ago", tags: ["Marketing", "Startup"], source: "Cold Outreach", createdAt: "Feb 28",
    enrichment: { linkedin: "linkedin.com/in/tomashford", twitter: "@tomashford", companySize: "10-50", industry: "Digital Marketing", confidence: 85 },
  },
  {
    id: "6", name: "Sarah Chen", company: "Nexus Labs", email: "sarah@nexus.io", phone: "+1 (415) 555-0101", website: "nexus.io",
    status: "lead", healthScore: 52, totalRevenue: 0, revenueDisplay: "$0", activeProjects: 0, completedProjects: 0,
    lastInteraction: "2d ago", tags: ["SaaS", "Enterprise", "AI"], source: "Website Form", createdAt: "Mar 10",
    enrichment: { linkedin: "linkedin.com/in/sarachen", twitter: "@sarahchen_dev", companySize: "50-200", industry: "SaaS / AI", confidence: 94 },
  },
  {
    id: "7", name: "Elena Vogt", company: "Cascade Media", email: "elena@cascade.com", phone: "+44 20 7946 0123", website: "cascade.com",
    status: "past", healthScore: 61, totalRevenue: 18200, revenueDisplay: "$18,200", activeProjects: 0, completedProjects: 2,
    lastInteraction: "2w ago", tags: ["Media", "Branding"], source: "Referral", createdAt: "Nov 05",
    enrichment: { linkedin: "linkedin.com/in/elenavogt", twitter: "@elenavogt", companySize: "10-50", industry: "Media & Publishing", confidence: 72 },
  },
  {
    id: "8", name: "Ryan Kimura", company: "Peak Ventures", email: "ryan@peak.vc", phone: "+1 (650) 555-0188", website: "peak.vc",
    status: "past", healthScore: 55, totalRevenue: 31400, revenueDisplay: "$31,400", activeProjects: 0, completedProjects: 3,
    lastInteraction: "1mo ago", tags: ["VC", "Enterprise", "Retainer"], source: "Conference", createdAt: "Sep 20",
    enrichment: { linkedin: "linkedin.com/in/ryankimura", twitter: "@ryankimura", companySize: "10-50", industry: "Venture Capital", confidence: 88 },
  },
];

const allTags = ["Enterprise", "VIP", "Startup", "FinTech", "HealthTech", "E-commerce", "DevTools", "SaaS", "AI", "Marketing", "Media", "Branding", "VC", "Retainer"];

/* ═══════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════ */

function ClientMetrics({ clients }: { clients: ClientRecord[] }) {
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const lifetimeRevenue = clients.reduce((s, c) => s + c.totalRevenue, 0);
  const avgHealth = totalClients > 0 ? Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / totalClients) : 0;

  const metrics = [
    { label: "Total Clients", value: totalClients.toString(), sub: `${clients.filter((c) => c.status === "lead").length} leads`, icon: Users },
    { label: "Active", value: activeClients.toString(), sub: "Currently engaged", icon: TrendingUp },
    { label: "Lifetime Revenue", value: `$${lifetimeRevenue.toLocaleString()}`, sub: "All-time earnings", icon: DollarSign },
    { label: "Avg Health Score", value: avgHealth.toString(), sub: "Relationship health", icon: Heart },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {metrics.map((m) => (
        <Surface key={m.label} className="p-5">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">{m.label}</Muted>
            <m.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">{m.value}</div>
          <Muted className="text-[10px] mt-1">{m.sub}</Muted>
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
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">New Client</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {[
            { label: "Full Name", placeholder: "e.g. David Frost" },
            { label: "Company", placeholder: "e.g. Acme Corp" },
            { label: "Email", placeholder: "e.g. david@acme.co" },
            { label: "Phone", placeholder: "e.g. +1 (415) 555-0199" },
            { label: "Website", placeholder: "e.g. acme.co" },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{field.label}</label>
              <Input placeholder={field.placeholder} className="h-9 bg-white border-zinc-200 text-sm" />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</label>
            <div className="flex items-center gap-2">
              {(["active", "lead"] as const).map((s) => (
                <button key={s} className="px-3 py-1.5 rounded-md border border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors capitalize">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 8).map((tag) => (
                <button key={tag} className="px-2 py-1 rounded bg-zinc-100 text-[10px] font-medium text-zinc-600 uppercase tracking-widest hover:bg-zinc-200 transition-colors">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="h-5 w-5 rounded bg-zinc-100 flex items-center justify-center">
              <Bot className="h-3 w-3 text-zinc-400" />
            </div>
            <Muted className="text-[10px] uppercase tracking-widest">AI will auto-enrich profile after creation</Muted>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" className="flex-1 border-zinc-200" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 font-semibold">Create Client</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

type StatusTab = "all" | "active" | "lead" | "past";

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusTab, setStatusTab] = React.useState<StatusTab>("all");
  const [tagFilter, setTagFilter] = React.useState("all");
  const [tagFilterOpen, setTagFilterOpen] = React.useState(false);
  const [addClientOpen, setAddClientOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return clientsData.filter((c) => {
      const matchesSearch = searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusTab === "all" || c.status === statusTab;
      const matchesTag = tagFilter === "all" || c.tags.includes(tagFilter);
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [searchQuery, statusTab, tagFilter]);

  const statusCounts = {
    all: clientsData.length,
    active: clientsData.filter((c) => c.status === "active").length,
    lead: clientsData.filter((c) => c.status === "lead").length,
    past: clientsData.filter((c) => c.status === "past").length,
  };

  const statusLabel: Record<string, string> = { active: "Active", lead: "Lead", past: "Past" };
  const tabs: StatusTab[] = ["all", "active", "lead", "past"];

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <H1>Clients</H1>
            <Muted>{clientsData.length} contacts in your rolodex.</Muted>
          </div>
          <Button className="font-semibold px-5 gap-2" onClick={() => setAddClientOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add Client
          </Button>
        </div>

        {/* Metrics */}
        <ClientMetrics clients={clientsData} />

        {/* Tabs + Search + Tag Filter */}
        <div className="space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 border-b border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={cn(
                  "px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px",
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

          {/* Search + Tag Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white border-zinc-200 text-sm focus:ring-0"
              />
            </div>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className={cn("h-9 border-zinc-200 gap-1.5", tagFilter !== "all" && "border-zinc-900")}
                onClick={() => setTagFilterOpen(!tagFilterOpen)}
              >
                <Tag className="h-3.5 w-3.5" />
                Tag{tagFilter !== "all" ? `: ${tagFilter}` : ""}
              </Button>
              {tagFilterOpen && (
                <div className="absolute left-0 top-11 z-50 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                  <button
                    className={cn("w-full px-3 py-2 text-left text-xs hover:bg-zinc-50", tagFilter === "all" && "font-bold text-zinc-900")}
                    onClick={() => { setTagFilter("all"); setTagFilterOpen(false); }}
                  >
                    All Tags
                  </button>
                  {allTags.map((t) => (
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
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Client</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Health</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Revenue</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Projects</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Tags</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Last Interaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                        </div>
                        <Muted className="text-sm">No clients match your filters.</Muted>
                        <Muted className="text-[10px] uppercase tracking-widest">Try adjusting your search or filters.</Muted>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <Link key={client.id} href={`/clients/${client.id}`} className="contents">
                      <tr className="group hover:bg-zinc-50/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-900 tracking-tight">{client.name}</span>
                                {client.enrichment.confidence >= 90 && (
                                  <Bot className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
                                )}
                              </div>
                              <div className="text-xs text-zinc-500">{client.company}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium capitalize">
                            {statusLabel[client.status] ?? client.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900 text-sm">{client.healthScore}</span>
                            <div className="w-12 h-[3px] bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${client.healthScore}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900">{client.revenueDisplay}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-zinc-600">{client.activeProjects + client.completedProjects}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {client.tags.slice(0, 2).map((tag) => (
                              <TagBadge key={tag} tag={tag} />
                            ))}
                            {client.tags.length > 2 && (
                              <span className="text-[10px] text-zinc-400 font-medium self-center">+{client.tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-zinc-400">{client.lastInteraction}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                      </tr>
                    </Link>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      {/* Add Client Drawer */}
      {addClientOpen && (
        <>
          <div className="fixed inset-0 bg-zinc-900/10 z-40" onClick={() => setAddClientOpen(false)} />
          <AddClientDrawer onClose={() => setAddClientOpen(false)} />
        </>
      )}
    </>
  );
}
