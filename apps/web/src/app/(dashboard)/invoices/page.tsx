"use client";

import * as React from "react";
import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Send,
  Download,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { useInvoices } from "@/lib/queries/invoices";

const tabs = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "processing", label: "Processing" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
] as const;

type TabKey = typeof tabs[number]["key"];

const statusStyles: Record<string, string> = {
  paid: "text-zinc-500",
  processing: "text-zinc-600",
  upcoming: "text-zinc-600",
  overdue: "text-zinc-900 font-bold",
};

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("all");
  const { data: invoices = [], isLoading } = useInvoices();

  const filtered = activeTab === "all"
    ? invoices
    : invoices.filter((inv) => inv.status === activeTab);

  const totals = {
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.numericAmount, 0),
    processing: invoices.filter((i) => i.status === "processing").reduce((s, i) => s + i.numericAmount, 0),
    upcoming: invoices.filter((i) => i.status === "upcoming").reduce((s, i) => s + i.numericAmount, 0),
    overdue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.numericAmount, 0),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Invoices</H1>
          <Muted className="truncate block">Payments overview and invoice management.</Muted>
        </div>
        <Button className="font-semibold px-4 sm:px-5 gap-2 w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Invoice
        </Button>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Paid</Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">${totals.paid.toLocaleString()}</div>
        </Surface>
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Processing</Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">${totals.processing.toLocaleString()}</div>
        </Surface>
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Upcoming</Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">${totals.upcoming.toLocaleString()}</div>
        </Surface>
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Overdue</Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">${totals.overdue.toLocaleString()}</div>
          {totals.overdue > 0 && <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 mt-2 shrink-0" />}
        </Surface>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full overflow-x-auto hide-scrollbar border-b border-zinc-200">
          <div className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => (
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
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search invoices..."
            className="pl-9 h-9 w-full bg-white border-zinc-200 text-sm focus:ring-0"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Invoice</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden sm:table-cell">Client</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Amount</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">Due Date</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="px-6 py-4"><Skeleton className="h-9 w-36" /></td>
                    <td className="px-6 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-7 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                      </div>
                      <Muted className="text-sm">No invoices match the current filter.</Muted>
                    </div>
                  </td>
                </tr>
              ) : null}
              {!isLoading && filtered.map((invoice) => (
                <tr key={invoice.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-zinc-900 tracking-tight truncate max-w-[150px] sm:max-w-[200px]">{invoice.number}</div>
                    <Muted className="text-[10px] truncate max-w-[150px] sm:max-w-[200px] block">Sent {invoice.sentDate}</Muted>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 truncate max-w-[120px] sm:max-w-[150px] hidden sm:table-cell">{invoice.client}</td>
                  <td className="px-6 py-4 font-medium text-zinc-900 truncate max-w-[100px] sm:max-w-[120px]">{invoice.amount}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={cn("border-zinc-200 bg-transparent shrink-0", statusStyles[invoice.status])}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap hidden md:table-cell">{invoice.dueDate}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {invoice.status === "overdue" && (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] px-2.5 border-zinc-200">
                          <Send className="h-3 w-3 mr-1" />
                          Remind
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5 text-zinc-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}
