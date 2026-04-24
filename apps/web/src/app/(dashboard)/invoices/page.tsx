"use client";

import * as React from "react";
import { H1, Muted, P } from "@/components/ui/typography";
import { CsvImportExport } from "@/components/data/csv-import-export";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RecurringInvoicesPanel } from "@/components/invoices/recurring-invoices-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Send,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  type CreateInvoicePayload,
} from "@/lib/queries/invoices";
import { useContracts } from "@/lib/queries/contracts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const tabs = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "processing", label: "Processing" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const statusStyles: Record<string, string> = {
  paid: "text-zinc-500",
  processing: "text-zinc-600",
  upcoming: "text-zinc-600",
  overdue: "text-zinc-900 font-bold",
};

// ---------------------------------------------------------------------------
// New Invoice Dialog
// ---------------------------------------------------------------------------

function NewInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: contracts = [] } = useContracts();
  const { mutateAsync: createInvoice, isPending } = useCreateInvoice();

  const [form, setForm] = React.useState<{
    contractId: string;
    amount: string;
    currency: string;
    dueDate: string;
    notes: string;
  }>({
    contractId: "",
    amount: "",
    currency: "USD",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    notes: "",
  });
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(form.amount);
    if (!form.contractId) return setError("Please select a contract.");
    if (isNaN(amount) || amount <= 0)
      return setError("Amount must be a positive number.");

    try {
      const payload: CreateInvoicePayload = {
        contractId: form.contractId,
        amount,
        currency: form.currency,
      };
      await createInvoice(payload);
      onOpenChange(false);
      setForm({
        contractId: "",
        amount: "",
        currency: "USD",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        notes: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">
            New Invoice
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Contract</label>
            <select
              value={form.contractId}
              onChange={(e) =>
                setForm((f) => ({ ...f, contractId: e.target.value }))
              }
              className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
              required
            >
              <option value="">Select a contract…</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                className="h-10 border-zinc-200 bg-white text-sm text-zinc-900 [color-scheme:light]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Currency</label>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
                className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Due Date</label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
              className="h-10 border-zinc-200 bg-white text-sm text-zinc-900 [color-scheme:light]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Notes{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Payment terms, project details…"
              rows={3}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 resize-none"
            />
          </div>

          {error && (
            <P className="text-xs text-red-600 border border-red-100 bg-red-50/50 rounded-md px-3 py-2">
              {error}
            </P>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-200"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("all");
  const [search, setSearch] = React.useState("");
  const [newInvoiceOpen, setNewInvoiceOpen] = React.useState(false);
  const { data: invoices = [], isLoading } = useInvoices();
  const { mutateAsync: updateInvoice } = useUpdateInvoice();

  // Filter by tab then by search term (invoice number or client).
  const filtered = React.useMemo(() => {
    let list = activeTab === "all" ? invoices : invoices.filter((inv) => inv.status === activeTab);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (inv) =>
          inv.number.toLowerCase().includes(term) ||
          inv.client.toLowerCase().includes(term) ||
          inv.contractTitle.toLowerCase().includes(term),
      );
    }
    return list;
  }, [invoices, activeTab, search]);

  const totals = {
    paid: invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.numericAmount, 0),
    processing: invoices
      .filter((i) => i.status === "processing")
      .reduce((s, i) => s + i.numericAmount, 0),
    upcoming: invoices
      .filter((i) => i.status === "upcoming")
      .reduce((s, i) => s + i.numericAmount, 0),
    overdue: invoices
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + i.numericAmount, 0),
  };

  async function handleMarkPaid(id: string) {
    await updateInvoice({ id, status: "completed" });
  }

  async function handleMarkFailed(id: string) {
    await updateInvoice({ id, status: "failed" });
  }

  return (
    <div className="space-y-8">
      <NewInvoiceDialog
        open={newInvoiceOpen}
        onOpenChange={setNewInvoiceOpen}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Invoices</H1>
          <Muted className="truncate block">
            Payments overview and invoice management.
          </Muted>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CsvImportExport resource="invoices" />
          <Button
            className="font-semibold px-4 sm:px-5 gap-2 w-full sm:w-auto"
            onClick={() => setNewInvoiceOpen(true)}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
            Paid
          </Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
            ${totals.paid.toLocaleString()}
          </div>
        </Surface>
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
            Processing
          </Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
            ${totals.processing.toLocaleString()}
          </div>
        </Surface>
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
            Upcoming
          </Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
            ${totals.upcoming.toLocaleString()}
          </div>
        </Surface>
        <Surface className="p-5 flex flex-col min-w-0">
          <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">
            Overdue
          </Muted>
          <div className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold tracking-tighter text-zinc-900 mt-1 truncate">
            ${totals.overdue.toLocaleString()}
          </div>
          {totals.overdue > 0 && (
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 mt-2 shrink-0" />
          )}
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
                    : "border-transparent text-zinc-400 hover:text-zinc-600",
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
            placeholder="Search invoices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Invoice
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden sm:table-cell">
                  Client
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Amount
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hidden md:table-cell">
                  Due Date
                </th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="px-6 py-4">
                        <Skeleton className="h-9 w-36" />
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <Skeleton className="h-5 w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-7 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center">
                            <FileText
                              className="h-5 w-5 text-zinc-300"
                              strokeWidth={1.5}
                            />
                          </div>
                          <Muted className="text-sm">
                            {search
                              ? "No invoices match your search."
                              : "No invoices match the current filter."}
                          </Muted>
                          {!search && activeTab === "all" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-zinc-200 mt-1"
                              onClick={() => setNewInvoiceOpen(true)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Create your first invoice
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                  : null}
              {!isLoading &&
                filtered.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="group hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
                        {invoice.number}
                      </div>
                      <Muted className="text-[10px] truncate max-w-[150px] sm:max-w-[200px] block">
                        Sent {invoice.sentDate}
                      </Muted>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 truncate max-w-[120px] sm:max-w-[150px] hidden sm:table-cell">
                      {invoice.client}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 truncate max-w-[100px] sm:max-w-[120px]">
                      {invoice.amount}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-zinc-200 bg-transparent shrink-0",
                          statusStyles[invoice.status],
                        )}
                      >
                        {invoice.status.charAt(0).toUpperCase() +
                          invoice.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap hidden md:table-cell">
                      {invoice.dueDate}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {invoice.status === "overdue" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2.5 border-zinc-200"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Remind
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 shadow-lg"
                          >
                            {invoice.status !== "paid" && (
                              <DropdownMenuItem
                                className="text-xs gap-2 cursor-pointer"
                                onClick={() => handleMarkPaid(invoice.id)}
                              >
                                <CheckCircle className="h-3.5 w-3.5 text-zinc-500" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {invoice.status === "paid" && (
                              <DropdownMenuItem
                                className="text-xs gap-2 cursor-pointer"
                                onClick={() => handleMarkFailed(invoice.id)}
                              >
                                Mark as Failed
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Surface>

      <RecurringInvoicesPanel />
    </div>
  );
}
