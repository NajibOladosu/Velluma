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
  type ContractStatus,
  type Contract,
  type ContractTemplate,
  contractsData,
  templatesData,
} from "@/lib/data/contracts";
import {
  Plus,
  Search,
  X,
  FileText,
  Send,
  Copy,
  Archive,
  Clock,
  CheckCircle2,
  ShieldCheck,
  User,
  Library,
  Briefcase,
  BookOpen,
  Lock,
} from "lucide-react";


type ViewMode = "active" | "templates";



const statusTabs: { key: ContractStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending", label: "Pending" },
  { key: "signed", label: "Signed" },
  { key: "expired", label: "Expired" },
];

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "text-zinc-500 border-zinc-200" },
  pending: { label: "Pending Signatures", className: "text-amber-700 border-amber-300 bg-amber-50/50" },
  signed: { label: "Executed", className: "text-zinc-900 border-zinc-900 font-bold" },
  expired: { label: "Expired", className: "text-zinc-400 border-zinc-200" },
};

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function ContractsDirectoryPage() {
  const [viewMode, setViewMode] = React.useState<ViewMode>("active");
  const [activeTab, setActiveTab] = React.useState<ContractStatus | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showNewDrawer, setShowNewDrawer] = React.useState(false);
  
  // Drawer state
  const [newTitle, setNewTitle] = React.useState("");
  const [newClient, setNewClient] = React.useState("");
  const [newTemplate, setNewTemplate] = React.useState("t1");

  /* ── Derived Data ─────────────────────────────── */
  const filteredContracts = React.useMemo(() => {
    let list = contractsData;
    if (activeTab !== "all") list = list.filter((c) => c.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) => c.title.toLowerCase().includes(q) || c.client.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, searchQuery]);

  const filteredTemplates = React.useMemo(() => {
    if (!searchQuery.trim()) return templatesData;
    const q = searchQuery.toLowerCase();
    return templatesData.filter((t) => t.name.toLowerCase().includes(q));
  }, [searchQuery]);

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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <H1 className="truncate">Contracts & Legal</H1>
            <Muted className="truncate block">
              Manage your legal templates and track active client agreements.
            </Muted>
          </div>
          <Button
            className="font-semibold px-4 sm:px-5 gap-2 w-full sm:w-auto shrink-0"
            onClick={() => setShowNewDrawer(true)}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            {viewMode === "templates" ? "New Template" : "Draft Contract"}
          </Button>
        </div>

        {/* ── View Toggle ──────────────────────── */}
        <div className="flex bg-zinc-100/50 p-1 border border-zinc-200 rounded-lg w-fit">
          <button
            onClick={() => { setViewMode("active"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-semibold transition-all shadow-sm",
              viewMode === "active"
                ? "bg-white text-zinc-900 border border-zinc-200/50"
                : "text-zinc-500 hover:text-zinc-700 shadow-none border border-transparent"
            )}
          >
            <Briefcase className="h-4 w-4" />
            Active Agreements
          </button>
          <button
            onClick={() => { setViewMode("templates"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-semibold transition-all shadow-sm",
              viewMode === "templates"
                ? "bg-white text-zinc-900 border border-zinc-200/50"
                : "text-zinc-500 hover:text-zinc-700 shadow-none border border-transparent"
            )}
          >
            <Library className="h-4 w-4" />
            Template Library
          </button>
        </div>
      </div>

      {viewMode === "templates" ? (
        // ==========================================
        // TEMPLATES VIEW
        // ==========================================
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <H3 className="truncate">Your Templates</H3>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-full sm:w-64 bg-white border-zinc-200 text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Surface key={template.id} className="flex flex-col p-0 overflow-hidden group">
                <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-md bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {template.type === "standard" ? (
                        <ShieldCheck className="h-5 w-5 text-zinc-700" />
                      ) : (
                        <FileText className="h-5 w-5 text-zinc-500" />
                      )}
                    </div>
                    {template.type === "standard" && (
                      <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 flex gap-1 items-center">
                        <Lock className="h-3 w-3" />
                        Standardized
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-zinc-900 text-base mb-1 tracking-tight group-hover:underline cursor-pointer truncate">
                    <Link href={`/contracts/${template.id}`}>{template.name}</Link>
                  </h4>
                  <p className="text-sm text-zinc-500 leading-relaxed flex-1 line-clamp-2 break-words">
                    {template.description}
                  </p>
                </div>
                <div className="px-5 py-3 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {template.lastModified}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      Used {template.usageCount}x
                    </span>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        </div>
      ) : (
        // ==========================================
        // ACTIVE AGREEMENTS VIEW
        // ==========================================
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Surface className="p-5 flex flex-col min-w-0">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
                Total Protected Value
              </Muted>
              <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
                ${metrics.totalProtected.toLocaleString()}
              </div>
            </Surface>
            <Surface className="p-5 flex flex-col min-w-0">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
                Pending Signatures
              </Muted>
              <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
                {metrics.pending}
              </div>
            </Surface>
            <Surface className="p-5 flex flex-col min-w-0">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
                Drafts
              </Muted>
              <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
                {metrics.drafts}
              </div>
            </Surface>
            <Surface className="p-5 flex flex-col min-w-0">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
                Fully Executed
              </Muted>
              <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
                {metrics.signedCount}{" "}
                <span className="text-sm font-normal text-zinc-500">
                  · ${metrics.signedValue.toLocaleString()}
                </span>
              </div>
            </Surface>
          </div>

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
                  placeholder="Search agreements..."
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

          {/* Contracts Table */}
          <Surface className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Contract</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden sm:table-cell">Value</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">Signers</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden lg:table-cell">Dates</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredContracts.length > 0 ? (
                    filteredContracts.map((contract) => (
                      <tr
                        key={contract.id}
                        className="group hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-4 py-4 align-top">
                          <Link href={`/contracts/${contract.id}`} className="block">
                            <div className="flex gap-3">
                              <div className="h-9 w-9 mt-0.5 rounded-md bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                                <FileText
                                  className="h-4 w-4 text-zinc-500"
                                  strokeWidth={1.5}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-900 tracking-tight text-sm group-hover:underline truncate max-w-[150px] sm:max-w-[250px]">
                                  {contract.title}
                                </div>
                                <Muted className="text-[10px] truncate max-w-[150px] sm:max-w-[250px] block">
                                  {contract.client} · {contract.template}
                                </Muted>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge
                            variant="outline"
                            className={cn(
                              "bg-transparent shrink-0",
                              statusConfig[contract.status].className
                            )}
                          >
                            {statusConfig[contract.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 font-medium text-zinc-900 align-top hidden sm:table-cell">
                          <div className="truncate max-w-[100px]">{contract.value}</div>
                        </td>
                        <td className="px-4 py-4 align-top hidden md:table-cell">
                          <div className="space-y-2">
                            {contract.signers.map((signer) => (
                              <div key={signer.id} className="flex items-center gap-2">
                                {signer.status === "signed" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-zinc-900" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                )}
                                <span className={cn(
                                  "text-sm font-medium truncate max-w-[120px]",
                                  signer.status === "signed" ? "text-zinc-900" : "text-zinc-500"
                                )}>{signer.name}</span>
                                <Muted className="text-[10px]">({signer.role})</Muted>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top hidden lg:table-cell">
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
                        <td className="px-4 py-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
                          <Briefcase className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
                          <p className="text-sm text-zinc-500">
                            No active agreements match your filters.
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
        </div>
      )}

      {/* ── New Drawer ─────────────────────────── */}
      {showNewDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-zinc-900/20"
            onClick={() => setShowNewDrawer(false)}
          />
          <div className="relative w-full max-w-md bg-white border-l border-zinc-200 shadow-lg p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <H3>{viewMode === "templates" ? "New Template" : "Draft Contract"}</H3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewDrawer(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Separator />

            {viewMode === "active" && (
              <div className="space-y-4">
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Agreement Title
                  </label>
                  <Input
                    placeholder="e.g., Master Services Agreement"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700">
                    Base Template
                  </label>
                  <div className="space-y-2">
                    {templatesData.map((t) => (
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
                        <div className="h-8 w-8 mt-0.5 rounded-md bg-white border border-zinc-200 shadow-sm flex items-center justify-center flex-shrink-0">
                          {t.type === "standard" ? (
                            <ShieldCheck className="h-4 w-4 text-zinc-700" />
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
              </div>
            )}

            {viewMode === "templates" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Template Name
                  </label>
                  <Input
                    placeholder="e.g., Retainer Agreement"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Description
                  </label>
                  <Input
                    placeholder="Brief description for internal use"
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Action */}
            <Button className="w-full font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              {viewMode === "templates" ? "Create Template" : "Start Draft"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
