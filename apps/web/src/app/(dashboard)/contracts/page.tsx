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
  ShieldCheck,
  Users,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ContractStatus = "draft" | "pending" | "signed" | "expired";

interface Signer {
  id: string;
  name: string;
  role: string;
  status: "pending" | "signed";
}

interface Contract {
  id: string;
  title: string;
  client: string;
  clientId: string;
  status: ContractStatus;
  value: string;
  numericValue: number;
  createdAt: string;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  template: string;
  signers: Signer[];
}

/* ═══════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════ */

const contractsData: Contract[] = [
  {
    id: "1",
    title: "Master Services Agreement",
    client: "Acme Corp",
    clientId: "1",
    status: "signed",
    value: "$12,500",
    numericValue: 12500,
    createdAt: "Feb 28, 2026",
    sentAt: "Mar 01, 2026",
    signedAt: "Mar 03, 2026",
    expiresAt: null,
    template: "Standardized",
    signers: [
      { id: "s1", name: "David Kim", role: "Client", status: "signed" },
      { id: "s2", name: "Sarah Connor", role: "Freelancer", status: "signed" },
    ],
  },
  {
    id: "2",
    title: "Brand Identity Contract",
    client: "Vesper AI",
    clientId: "3",
    status: "pending",
    value: "$8,500",
    numericValue: 8500,
    createdAt: "Mar 05, 2026",
    sentAt: "Mar 06, 2026",
    signedAt: null,
    expiresAt: "Mar 20, 2026",
    template: "Standardized",
    signers: [
      { id: "s3", name: "Lena Ray", role: "Client", status: "pending" },
      { id: "s2", name: "Sarah Connor", role: "Freelancer", status: "signed" },
    ],
  },
  {
    id: "3",
    title: "E-Commerce Build Agreement",
    client: "Terra Finance",
    clientId: "2",
    status: "pending",
    value: "$22,000",
    numericValue: 22000,
    createdAt: "Mar 08, 2026",
    sentAt: "Mar 09, 2026",
    signedAt: null,
    expiresAt: "Mar 23, 2026",
    template: "Blank/Editable",
    signers: [
      { id: "s4", name: "Marcus Thorne", role: "Client", status: "pending" },
      { id: "s5", name: "Julia Ng", role: "Co-Founder", status: "signed" },
      { id: "s2", name: "Sarah Connor", role: "Freelancer", status: "signed" },
    ],
  },
  {
    id: "4",
    title: "Mobile App MVP Subcontractor Agreement",
    client: "Orbit Systems",
    clientId: "4",
    status: "draft",
    value: "$18,000",
    numericValue: 18000,
    createdAt: "Mar 10, 2026",
    sentAt: null,
    signedAt: null,
    expiresAt: null,
    template: "Standardized",
    signers: [
      { id: "s6", name: "James Holden", role: "Client", status: "pending" },
      { id: "s2", name: "Sarah Connor", role: "Freelancer", status: "pending" },
    ],
  },
  {
    id: "5",
    title: "Marketing Website Retainer",
    client: "Bloom Studio",
    clientId: "5",
    status: "signed",
    value: "$6,200",
    numericValue: 6200,
    createdAt: "Feb 20, 2026",
    sentAt: "Feb 21, 2026",
    signedAt: "Feb 24, 2026",
    expiresAt: null,
    template: "Blank/Editable",
    signers: [
      { id: "s7", name: "Chloe Vance", role: "Client", status: "signed" },
      { id: "s2", name: "Sarah Connor", role: "Freelancer", status: "signed" },
    ],
  },
  {
    id: "6",
    title: "SaaS Dashboard Redesign Terms",
    client: "Nexus Labs",
    clientId: "6",
    status: "expired",
    value: "$15,000",
    numericValue: 15000,
    createdAt: "Feb 01, 2026",
    sentAt: "Feb 02, 2026",
    signedAt: null,
    expiresAt: "Feb 16, 2026",
    template: "Standardized",
    signers: [
      { id: "s8", name: "Tom Haverford", role: "Client", status: "pending" },
      { id: "s2", name: "Sarah Connor", role: "Freelancer", status: "signed" },
    ],
  },
];

const statusTabs: { key: ContractStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending", label: "Pending" },
  { key: "signed", label: "Signed" },
  { key: "expired", label: "Expired" },
];

const statusConfig: Record<
  ContractStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "text-zinc-500 border-zinc-200" },
  pending: { label: "Pending Signatures", className: "text-amber-700 border-amber-300 bg-amber-50/50" },
  signed: { label: "Executed", className: "text-zinc-900 border-zinc-900 font-bold" },
  expired: { label: "Expired", className: "text-zinc-400 border-zinc-200" },
};

const templates = [
  { id: "standard", name: "Standardized (Locked Clauses)", description: "Lawyer-vetted. Core clauses cannot be edited." },
  { id: "blank", name: "Blank / Editable", description: "Start from scratch or edit all terms." },
];

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function ContractsDirectoryPage() {
  const [activeTab, setActiveTab] = React.useState<ContractStatus | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showNewDrawer, setShowNewDrawer] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newClient, setNewClient] = React.useState("");
  const [newTemplate, setNewTemplate] = React.useState("standard");

  /* ── Filtering ────────────────────────────────── */
  const filtered = React.useMemo(() => {
    let list = contractsData;
    if (activeTab !== "all") list = list.filter((c) => c.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.client.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, searchQuery]);

  /* ── Metrics ──────────────────────────────────── */
  const metrics = React.useMemo(() => {
    const active = contractsData.filter((c) => c.status !== "expired");
    const drafts = contractsData.filter((c) => c.status === "draft");
    const pending = contractsData.filter((c) => c.status === "pending");
    const signed = contractsData.filter((c) => c.status === "signed");
    return {
      totalProtected: active.reduce((s, c) => s + c.numericValue, 0),
      drafts: drafts.length,
      pending: pending.length,
      signedCount: signed.length,
      signedValue: signed.reduce((s, c) => s + c.numericValue, 0),
    };
  }, []);

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: contractsData.length };
    for (const c of contractsData) counts[c.status] = (counts[c.status] || 0) + 1;
    return counts;
  }, []);

  return (
    <div className="space-y-8 pb-10">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <H1>Contracts</H1>
          <Muted>
            {contractsData.length} agreements · $
            {metrics.totalProtected.toLocaleString()} protected value
          </Muted>
        </div>
        <Button
          className="font-semibold px-5 gap-2"
          onClick={() => setShowNewDrawer(true)}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Contract
        </Button>
      </div>

      {/* ── Metrics Row ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Total Protected Value
          </Muted>
          <div className="text-2xl font-bold tracking-tighter text-zinc-900 mt-1">
            ${metrics.totalProtected.toLocaleString()}
          </div>
        </Surface>
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Pending Signatures
          </Muted>
          <div className="text-2xl font-bold tracking-tighter text-zinc-900 mt-1">
            {metrics.pending}
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
            Fully Executed
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 border-b border-zinc-200">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-[1px]",
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-64 bg-white border-zinc-200 text-sm"
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

      {/* ── Contracts Table ────────────────────── */}
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Contract
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Value
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Signers
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Dates
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length > 0 ? (
                filtered.map((contract) => (
                  <tr
                    key={contract.id}
                    className="group hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 align-top">
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="block"
                      >
                        <div className="flex gap-3">
                          <div className="h-9 w-9 mt-0.5 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck
                              className="h-4 w-4 text-zinc-500"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 tracking-tight text-sm group-hover:underline">
                              {contract.title}
                            </div>
                            <Muted className="text-[10px]">
                              {contract.client} · {contract.template}
                            </Muted>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <Badge
                        variant="outline"
                        className={cn(
                          "bg-transparent",
                          statusConfig[contract.status].className
                        )}
                      >
                        {statusConfig[contract.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 align-top">
                      {contract.value}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2">
                        {contract.signers.map((signer) => (
                          <div key={signer.id} className="flex items-center gap-2">
                            {signer.status === "signed" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-900" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                            <span className={cn(
                              "text-sm font-medium",
                              signer.status === "signed" ? "text-zinc-900" : "text-zinc-500"
                            )}>{signer.name}</span>
                            <Muted className="text-[10px]">({signer.role})</Muted>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <span className="w-12 text-[10px] uppercase font-semibold text-zinc-400">Created</span>
                          {contract.createdAt}
                        </div>
                        {contract.sentAt && (
                          <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <span className="w-12 text-[10px] uppercase font-semibold text-zinc-400">Sent</span>
                            {contract.sentAt}
                          </div>
                        )}
                        {contract.signedAt && (
                           <div className="flex items-center gap-2 text-sm text-zinc-900 font-medium">
                           <span className="w-12 text-[10px] uppercase font-semibold text-zinc-400">Signed</span>
                           {contract.signedAt}
                         </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {contract.status === "draft" && (
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
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
                      <p className="text-sm text-zinc-500">
                        No contracts match your filters.
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

      {/* ── New Contract Drawer ────────────────── */}
      {showNewDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-zinc-900/20"
            onClick={() => setShowNewDrawer(false)}
          />
          <div className="relative w-full max-w-md bg-white border-l border-zinc-200 shadow-lg p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <H3>New Contract</H3>
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
                Contract Title
              </label>
              <Input
                placeholder="e.g., Master Services Agreement"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700">
                Template Type
              </label>
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setNewTemplate(t.id)}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-md border cursor-pointer transition-all",
                      newTemplate === t.id
                        ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50/50"
                        : "border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    <div className="h-8 w-8 mt-0.5 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      {t.id === "standard" ? (
                        <ShieldCheck className="h-4 w-4 text-zinc-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {t.name}
                      </div>
                      <Muted className="text-xs mt-0.5 leading-relaxed">{t.description}</Muted>
                    </div>
                    {newTemplate === t.id && (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-zinc-900 ml-auto mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Action */}
            <Button className="w-full font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              Create Contract
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
