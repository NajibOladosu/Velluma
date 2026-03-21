"use client";

import * as React from "react";
import { H1, H3, Muted } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Plus,
  Search,
  X,
  FileText,
  Send,
  Eye,
  Copy,
  Archive,
  Clock,
  DollarSign,
  CheckCircle2,
  PenLine,
  ArrowUpRight,
  Wallet,
  Calendar,
  LayoutTemplate,
  User,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "expired";

interface Proposal {
  id: string;
  title: string;
  client: string;
  clientId: string;
  status: ProposalStatus;
  value: string;
  numericValue: number;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  template: string;
  viewCount: number;
  sections: number;
}

/* ═══════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════ */

const proposalsData: Proposal[] = [
  {
    id: "1",
    title: "Website Overhaul — Full Redesign",
    client: "Acme Corp",
    clientId: "1",
    status: "signed",
    value: "$12,500",
    numericValue: 12500,
    createdAt: "Feb 28, 2026",
    sentAt: "Mar 01, 2026",
    viewedAt: "Mar 01, 2026",
    signedAt: "Mar 03, 2026",
    expiresAt: null,
    template: "Website Project",
    viewCount: 8,
    sections: 5,
  },
  {
    id: "2",
    title: "Brand Identity Package",
    client: "Vesper AI",
    clientId: "3",
    status: "viewed",
    value: "$8,500",
    numericValue: 8500,
    createdAt: "Mar 05, 2026",
    sentAt: "Mar 06, 2026",
    viewedAt: "Mar 10, 2026",
    signedAt: null,
    expiresAt: "Mar 20, 2026",
    template: "Brand Package",
    viewCount: 4,
    sections: 5,
  },
  {
    id: "3",
    title: "E-Commerce Platform Build",
    client: "Terra Finance",
    clientId: "2",
    status: "sent",
    value: "$22,000",
    numericValue: 22000,
    createdAt: "Mar 08, 2026",
    sentAt: "Mar 09, 2026",
    viewedAt: null,
    signedAt: null,
    expiresAt: "Mar 23, 2026",
    template: "Website Project",
    viewCount: 0,
    sections: 5,
  },
  {
    id: "4",
    title: "Mobile App MVP — Phase 1",
    client: "Orbit Systems",
    clientId: "4",
    status: "draft",
    value: "$18,000",
    numericValue: 18000,
    createdAt: "Mar 10, 2026",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    expiresAt: null,
    template: "Blank",
    viewCount: 0,
    sections: 3,
  },
  {
    id: "5",
    title: "Marketing Website Refresh",
    client: "Bloom Studio",
    clientId: "5",
    status: "signed",
    value: "$6,200",
    numericValue: 6200,
    createdAt: "Feb 20, 2026",
    sentAt: "Feb 21, 2026",
    viewedAt: "Feb 22, 2026",
    signedAt: "Feb 24, 2026",
    expiresAt: null,
    template: "Website Project",
    viewCount: 5,
    sections: 5,
  },
  {
    id: "6",
    title: "SaaS Dashboard UI/UX",
    client: "Nexus Labs",
    clientId: "6",
    status: "expired",
    value: "$15,000",
    numericValue: 15000,
    createdAt: "Feb 01, 2026",
    sentAt: "Feb 02, 2026",
    viewedAt: "Feb 03, 2026",
    signedAt: null,
    expiresAt: "Feb 16, 2026",
    template: "Blank",
    viewCount: 2,
    sections: 4,
  },
  {
    id: "7",
    title: "Content Strategy Retainer",
    client: "Cascade Media",
    clientId: "7",
    status: "draft",
    value: "$4,500",
    numericValue: 4500,
    createdAt: "Mar 12, 2026",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    expiresAt: null,
    template: "Blank",
    viewCount: 0,
    sections: 2,
  },
  {
    id: "8",
    title: "API Integration Suite",
    client: "Acme Corp",
    clientId: "1",
    status: "viewed",
    value: "$9,800",
    numericValue: 9800,
    createdAt: "Mar 11, 2026",
    sentAt: "Mar 11, 2026",
    viewedAt: "Mar 13, 2026",
    signedAt: null,
    expiresAt: "Mar 25, 2026",
    template: "Website Project",
    viewCount: 3,
    sections: 5,
  },
  {
    id: "9",
    title: "Design System & Component Library",
    client: "Vesper AI",
    clientId: "3",
    status: "sent",
    value: "$11,200",
    numericValue: 11200,
    createdAt: "Mar 13, 2026",
    sentAt: "Mar 13, 2026",
    viewedAt: null,
    signedAt: null,
    expiresAt: "Mar 27, 2026",
    template: "Brand Package",
    viewCount: 0,
    sections: 5,
  },
  {
    id: "10",
    title: "Annual Maintenance Contract",
    client: "Bloom Studio",
    clientId: "5",
    status: "draft",
    value: "$3,600",
    numericValue: 3600,
    createdAt: "Mar 14, 2026",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    expiresAt: null,
    template: "Blank",
    viewCount: 0,
    sections: 2,
  },
];

const statusTabs: { key: ProposalStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "signed", label: "Signed" },
  { key: "expired", label: "Expired" },
];

const statusConfig: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "text-zinc-500 border-zinc-200" },
  sent: { label: "Sent", className: "text-zinc-700 border-zinc-300" },
  viewed: { label: "Viewed", className: "text-zinc-700 border-zinc-300" },
  signed: { label: "Signed", className: "text-zinc-900 border-zinc-900 font-bold" },
  expired: { label: "Expired", className: "text-zinc-400 border-zinc-200" },
};

const templates = [
  { id: "blank", name: "Blank", description: "Start from scratch" },
  { id: "website", name: "Website Project", description: "Design & development scope" },
  { id: "brand", name: "Brand Package", description: "Identity & brand guidelines" },
];

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function ProposalsDirectoryPage() {
  const [activeTab, setActiveTab] = React.useState<ProposalStatus | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showNewDrawer, setShowNewDrawer] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newClient, setNewClient] = React.useState("");
  const [newTemplate, setNewTemplate] = React.useState("blank");

  /* ── Filtering ────────────────────────────────── */
  const filtered = React.useMemo(() => {
    let list = proposalsData;
    if (activeTab !== "all") list = list.filter((p) => p.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, searchQuery]);

  /* ── Metrics ──────────────────────────────────── */
  const metrics = React.useMemo(() => {
    const active = proposalsData.filter((p) => p.status !== "expired");
    const drafts = proposalsData.filter((p) => p.status === "draft");
    const awaiting = proposalsData.filter(
      (p) => p.status === "sent" || p.status === "viewed"
    );
    const signed = proposalsData.filter((p) => p.status === "signed");
    return {
      totalPipeline: active.reduce((s, p) => s + p.numericValue, 0),
      drafts: drafts.length,
      awaiting: awaiting.length,
      signedCount: signed.length,
      signedValue: signed.reduce((s, p) => s + p.numericValue, 0),
    };
  }, []);

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: proposalsData.length };
    for (const p of proposalsData) counts[p.status] = (counts[p.status] || 0) + 1;
    return counts;
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <H1>Proposals</H1>
          <Muted>
            {proposalsData.length} proposals · $
            {metrics.totalPipeline.toLocaleString()} pipeline
          </Muted>
        </div>
        <Button
          className="font-semibold px-5 gap-2 self-start sm:self-auto"
          onClick={() => setShowNewDrawer(true)}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Proposal
        </Button>
      </div>

      {/* ── Metrics Row ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Total Pipeline
          </Muted>
          <div className="text-2xl font-bold tracking-tighter text-zinc-900 mt-1">
            ${metrics.totalPipeline.toLocaleString()}
          </div>
        </Surface>
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Drafts
          </Muted>
          <div className="text-2xl font-bold tracking-tighter text-zinc-900 mt-1">
            {metrics.drafts}
          </div>
        </Surface>
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Awaiting Signature
          </Muted>
          <div className="text-2xl font-bold tracking-tighter text-zinc-900 mt-1">
            {metrics.awaiting}
          </div>
        </Surface>
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Signed
          </Muted>
          <div className="text-2xl font-bold tracking-tighter text-zinc-900 mt-1">
            {metrics.signedCount}{" "}
            <span className="text-sm font-normal text-zinc-500">
              · ${metrics.signedValue.toLocaleString()}
            </span>
          </div>
        </Surface>
      </div>

      {/* ── Tabs + Search ──────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 border-b border-zinc-200 min-w-max">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-[1px] whitespace-nowrap",
                  activeTab === tab.key
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-400 hover:text-zinc-600"
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] text-zinc-400">
                  {tabCounts[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full sm:w-64 bg-white border-zinc-200 text-sm"
            />
          </div>
          {(searchQuery || activeTab !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
              }}
              className="h-9 text-xs text-zinc-500"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Proposals Table ────────────────────── */}
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Proposal</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden sm:table-cell">Value</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">Sent</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">Expires</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden lg:table-cell">Views</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length > 0 ? (
                filtered.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="group hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/proposals/${proposal.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                            <FileText
                              className="h-4 w-4 text-zinc-500"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 tracking-tight text-sm group-hover:underline">
                              {proposal.title}
                            </div>
                            <Muted className="text-[10px]">
                              {proposal.client} · {proposal.template}
                            </Muted>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "bg-transparent",
                          statusConfig[proposal.status].className
                        )}
                      >
                        {statusConfig[proposal.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell font-medium text-zinc-900">
                      {proposal.value}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-500 hidden md:table-cell">
                      {proposal.sentAt || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-500 hidden md:table-cell">
                      {proposal.expiresAt || "—"}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {proposal.viewCount > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                          <Eye
                            className="h-3.5 w-3.5 text-zinc-400"
                            strokeWidth={1.5}
                          />
                          {proposal.viewCount}
                          {proposal.viewedAt && (
                            <Muted className="text-[10px] ml-1">
                              · Last {proposal.viewedAt}
                            </Muted>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {proposal.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2.5 border-zinc-200"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                        >
                          <Copy
                            className="h-3.5 w-3.5 text-zinc-400"
                            strokeWidth={1.5}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                        >
                          <Archive
                            className="h-3.5 w-3.5 text-zinc-400"
                            strokeWidth={1.5}
                          />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
                      <p className="text-sm text-zinc-500">
                        No proposals match your filters.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setSearchQuery("");
                          setActiveTab("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>

      {/* ── New Proposal Drawer ────────────────── */}
      {showNewDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-zinc-900/20"
            onClick={() => setShowNewDrawer(false)}
          />
          <div className="relative w-full max-w-md bg-white border-l border-zinc-200 shadow-lg p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <H3>New Proposal</H3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewDrawer(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Separator />

            {/* Client */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Client</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Select a client..."
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">
                Proposal Title
              </label>
              <Input
                placeholder="e.g., Website Redesign Proposal"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700">
                Start From Template
              </label>
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setNewTemplate(t.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all",
                      newTemplate === t.id
                        ? "border-zinc-900 ring-1 ring-zinc-900"
                        : "border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <LayoutTemplate
                        className="h-4 w-4 text-zinc-500"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900">
                        {t.name}
                      </div>
                      <Muted className="text-[10px]">{t.description}</Muted>
                    </div>
                    {newTemplate === t.id && (
                      <CheckCircle2 className="h-4 w-4 text-zinc-900 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Escrow Info */}
            <Surface className="p-4 space-y-3 bg-zinc-900 text-white">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">
                  Smart File Flow
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your proposal will include interactive pricing, a legally-vetted
                contract, and a secure payment page — all in one seamless client
                experience.
              </p>
            </Surface>

            <Button className="w-full font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              Create Proposal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
