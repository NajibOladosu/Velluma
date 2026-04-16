"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle2,
  PenLine,
  Wallet,
  LayoutTemplate,
  User,
  Download,
  ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProposals,
  useCreateProposal,
  useDuplicateProposal,
  useDeleteProposal,
  useUpdateProposalStatus,
  type ProposalStatus,
  type Proposal,
} from "@/lib/queries/proposals";
import { useClients } from "@/lib/queries/clients";

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
  signed: {
    label: "Signed",
    className: "text-zinc-900 border-zinc-900 font-bold",
  },
  expired: { label: "Expired", className: "text-zinc-400 border-zinc-200" },
};

const templates = [
  { id: "blank", name: "Blank", description: "Start from scratch" },
  {
    id: "website",
    name: "Website Project",
    description: "Design & development scope",
  },
  {
    id: "brand",
    name: "Brand Package",
    description: "Identity & brand guidelines",
  },
];

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function ProposalsDirectoryPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<ProposalStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showNewDrawer, setShowNewDrawer] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  // ── New proposal form state ──────────────────────
  const [newTitle, setNewTitle] = React.useState("");
  const [newTemplate, setNewTemplate] = React.useState("blank");
  const [clientSearch, setClientSearch] = React.useState("");
  const [selectedClientId, setSelectedClientId] = React.useState("");
  const [selectedClientName, setSelectedClientName] = React.useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = React.useState(false);

  // ── Data ────────────────────────────────────────
  const { data: proposalsData = [], isLoading } = useProposals();
  const { data: clients = [] } = useClients();
  const createProposal = useCreateProposal();
  const duplicateProposal = useDuplicateProposal();
  const deleteProposal = useDeleteProposal();
  const updateStatus = useUpdateProposalStatus();

  // ── Client search ────────────────────────────────
  const filteredClients = React.useMemo(() => {
    const q = clientSearch.toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company_name ?? "").toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // ── PDF download ─────────────────────────────────
  const handleDownloadPdf = React.useCallback(
    async (proposalId: string, title: string) => {
      setDownloadingId(proposalId);
      try {
        const res = await fetch(`/api/proposals/${proposalId}/pdf`);
        if (!res.ok) throw new Error("PDF generation failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `proposal-${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("[pdf export]", err);
      } finally {
        setDownloadingId(null);
      }
    },
    []
  );

  // ── Create proposal ───────────────────────────────
  const handleCreateProposal = React.useCallback(async () => {
    if (!newTitle.trim()) return;
    try {
      const proposal = await createProposal.mutateAsync({
        title: newTitle.trim(),
        clientId: selectedClientId || undefined,
        template: newTemplate,
      });
      setShowNewDrawer(false);
      setNewTitle("");
      setSelectedClientId("");
      setSelectedClientName("");
      setClientSearch("");
      setNewTemplate("blank");
      router.push(`/proposals/${proposal.id}`);
    } catch (err) {
      console.error("[create proposal]", err);
    }
  }, [
    newTitle,
    selectedClientId,
    newTemplate,
    createProposal,
    router,
  ]);

  const resetDrawer = () => {
    setNewTitle("");
    setSelectedClientId("");
    setSelectedClientName("");
    setClientSearch("");
    setNewTemplate("blank");
    setClientDropdownOpen(false);
    setShowNewDrawer(false);
  };

  /* ── Filtering ─────────────────────────────────── */
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
  }, [proposalsData, activeTab, searchQuery]);

  /* ── Metrics ───────────────────────────────────── */
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
  }, [proposalsData]);

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: proposalsData.length };
    for (const p of proposalsData)
      counts[p.status] = (counts[p.status] || 0) + 1;
    return counts;
  }, [proposalsData]);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <H1>Proposals</H1>
          <Muted>
            {isLoading
              ? "Loading…"
              : `${proposalsData.length} proposals · $${metrics.totalPipeline.toLocaleString()} pipeline`}
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
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
            Total Pipeline
          </Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
            ${metrics.totalPipeline.toLocaleString()}
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
            Awaiting Signature
          </Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
            {metrics.awaiting}
          </div>
        </Surface>
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
            Signed
          </Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
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
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Proposal
                </th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden sm:table-cell">
                  Value
                </th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">
                  Sent
                </th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">
                  Expires
                </th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden lg:table-cell">
                  Views
                </th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="px-6 py-4">
                      <Skeleton className="h-9 w-48" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <Skeleton className="h-5 w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-7 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((proposal) => (
                  <ProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    downloadingId={downloadingId}
                    onDownload={handleDownloadPdf}
                    onSend={() =>
                      updateStatus.mutate({ id: proposal.id, status: "sent" })
                    }
                    onCopy={() => duplicateProposal.mutate(proposal.id)}
                    onArchive={() => deleteProposal.mutate(proposal.id)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText
                        className="h-8 w-8 text-zinc-300"
                        strokeWidth={1.5}
                      />
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
            onClick={resetDrawer}
          />
          <div className="relative w-full max-w-md bg-white border-l border-zinc-200 shadow-lg p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <H3>New Proposal</H3>
              <Button variant="ghost" size="icon" onClick={resetDrawer}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Separator />

            {/* Client selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">
                Client
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 z-10" />
                <Input
                  placeholder="Search clients…"
                  value={selectedClientId ? selectedClientName : clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setSelectedClientId("");
                    setSelectedClientName("");
                    setClientDropdownOpen(true);
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  className="pl-9"
                />
                {selectedClientId && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    onClick={() => {
                      setSelectedClientId("");
                      setSelectedClientName("");
                      setClientSearch("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {clientDropdownOpen && !selectedClientId && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-white border border-zinc-200 rounded-md shadow-lg max-h-44 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-zinc-400">
                        No clients found
                      </div>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 flex items-center gap-2"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setSelectedClientName(c.name);
                            setClientSearch("");
                            setClientDropdownOpen(false);
                          }}
                        >
                          <span className="font-medium text-zinc-900">
                            {c.name}
                          </span>
                          {c.company_name && (
                            <span className="text-zinc-400 text-xs">
                              · {c.company_name}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProposal();
                }}
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

            <Button
              className="w-full font-semibold"
              disabled={!newTitle.trim() || createProposal.isPending}
              onClick={handleCreateProposal}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createProposal.isPending ? "Creating…" : "Create Proposal"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ProposalRow — extracted to keep the table body readable
   ───────────────────────────────────────────────────────────── */

function ProposalRow({
  proposal,
  downloadingId,
  onDownload,
  onSend,
  onCopy,
  onArchive,
}: {
  proposal: Proposal;
  downloadingId: string | null;
  onDownload: (id: string, title: string) => void;
  onSend: () => void;
  onCopy: () => void;
  onArchive: () => void;
}) {
  return (
    <tr className="group hover:bg-zinc-50/50 transition-colors">
      <td className="px-6 py-4">
        <Link href={`/proposals/${proposal.id}`} className="block">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 tracking-tight text-sm group-hover:underline truncate max-w-[150px] sm:max-w-[200px]">
                {proposal.title}
              </div>
              <Muted className="text-[10px] truncate max-w-[150px] sm:max-w-[200px] block">
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
            "bg-transparent shrink-0",
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
            <Eye className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
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
              onClick={onSend}
              title="Mark as sent"
            >
              <Send className="h-3 w-3 mr-1" />
              Send
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Download PDF"
            disabled={downloadingId === proposal.id}
            onClick={() => onDownload(proposal.id, proposal.title)}
          >
            {downloadingId === proposal.id ? (
              <svg
                className="h-3.5 w-3.5 text-zinc-400 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <Download
                className="h-3.5 w-3.5 text-zinc-400"
                strokeWidth={1.5}
              />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Duplicate proposal"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Delete proposal"
            onClick={onArchive}
          >
            <Archive
              className="h-3.5 w-3.5 text-zinc-400"
              strokeWidth={1.5}
            />
          </Button>
        </div>
      </td>
    </tr>
  );
}
