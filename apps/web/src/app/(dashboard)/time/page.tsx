"use client";

import * as React from "react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { H1, H2, Muted } from "@/components/ui/typography";
import { CsvImportExport } from "@/components/data/csv-import-export";
import { BulkActionBar } from "@/components/data/bulk-action-bar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Clock,
  Play,
  Square,
  Plus,
  Timer,
  DollarSign,
  BarChart2,
  Calendar,
  CheckCircle,
  XCircle,
  Send,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  useTimeEntries,
  useStartTimer,
  useStopTimer,
  useSubmitTimeEntry,
  useApproveTimeEntry,
  useRejectTimeEntry,
  useCreateManualEntry,
  type TimeEntry,
} from "@/lib/queries/time";
import { useContracts } from "@/lib/queries/contracts";

/* ═══════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════ */

const statusVariantMap: Record<TimeEntry["status"], "default" | "emerald" | "outline"> = {
  draft:     "outline",
  submitted: "default",
  approved:  "emerald",
  rejected:  "outline",
};

function StatusBadge({ status }: { status: TimeEntry["status"] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge
      variant={statusVariantMap[status]}
      className={cn(
        "shrink-0 whitespace-nowrap capitalize text-[10px]",
        status === "rejected" && "border-red-200 text-red-600",
        status === "approved" && "text-emerald-700 border-emerald-200",
      )}
    >
      {label}
    </Badge>
  );
}

/* ═══════════════════════════════════════════════════════
   APPROVAL ACTION BUTTONS
   ═══════════════════════════════════════════════════════ */

function EntryActions({ entry }: { entry: TimeEntry }) {
  const submit  = useSubmitTimeEntry();
  const approve = useApproveTimeEntry();
  const reject  = useRejectTimeEntry();

  const isPending =
    submit.isPending || approve.isPending || reject.isPending;

  if (entry.status === "draft") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px] gap-1"
        disabled={isPending}
        onClick={() => submit.mutate(entry.id)}
      >
        <Send className="h-3 w-3" strokeWidth={1.5} />
        Submit
      </Button>
    );
  }

  if (entry.status === "submitted") {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          disabled={isPending}
          onClick={() => approve.mutate(entry.id)}
        >
          <CheckCircle className="h-3 w-3" strokeWidth={1.5} />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] gap-1 text-red-600 border-red-200 hover:bg-red-50"
          disabled={isPending}
          onClick={() => reject.mutate({ id: entry.id })}
        >
          <XCircle className="h-3 w-3" strokeWidth={1.5} />
          Reject
        </Button>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function TimePage() {
  const [running, setRunning]     = React.useState(false);
  const [elapsed, setElapsed]     = React.useState(0);
  const [task, setTask]           = React.useState("");
  const [contractId, setContractId] = React.useState<string>("");
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const { data: recentEntries = [], isLoading, refetch: refetchEntries } = useTimeEntries();
  const { data: contracts = [] } = useContracts();
  const billableContracts = React.useMemo(
    () => contracts.filter((c) => c.status === "signed" || c.status === "pending"),
    [contracts],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAll = () => setSelectedIds(recentEntries.map((e) => e.id));
  const clearSelection = () => setSelectedIds([]);
  const allSelected = recentEntries.length > 0 && selectedIds.length === recentEntries.length;
  const startTimer = useStartTimer();
  const stopTimer  = useStopTimer();

  // Compute weekly metrics from real data
  const weeklyMetrics = React.useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEntries = recentEntries.filter(
      (e) => e.endTime && new Date(e.endTime) >= weekStart
    );
    const totalMins    = weekEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
    const billableEntries = weekEntries.filter((e) => e.hourlyRate > 0);
    const billableMins = billableEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
    const revenue      = billableEntries.reduce((s, e) => {
      const hrs = (e.durationMinutes ?? 0) / 60;
      return s + hrs * e.hourlyRate;
    }, 0);

    const totalHrs    = Math.floor(totalMins / 60);
    const totalMinRem = totalMins % 60;
    const billableHrs = Math.floor(billableMins / 60);
    const billableMinRem = billableMins % 60;
    const avgDailyMins = totalMins / 5;
    const avgHrs      = Math.floor(avgDailyMins / 60);
    const avgMinRem   = Math.floor(avgDailyMins % 60);

    return [
      { label: "Hours This Week",  value: `${totalHrs}h ${String(totalMinRem).padStart(2,"0")}m`,      sub: "Current week",  icon: Clock      },
      { label: "Billable Hours",   value: `${billableHrs}h ${String(billableMinRem).padStart(2,"0")}m`, sub: totalMins > 0 ? `${Math.round((billableMins / totalMins) * 100)}% billable` : "No entries", icon: DollarSign },
      { label: "Revenue Logged",   value: `$${Math.round(revenue).toLocaleString()}`,                   sub: "This week",     icon: BarChart2  },
      { label: "Avg Daily Hours",  value: `${avgHrs}h ${String(avgMinRem).padStart(2,"0")}m`,           sub: "Mon – Fri",     icon: Calendar   },
    ];
  }, [recentEntries]);

  // Stopwatch
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  function fmt(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  }

  async function handleToggle() {
    if (running) {
      if (activeSessionId) {
        await stopTimer.mutateAsync(activeSessionId);
      }
      setRunning(false);
      setElapsed(0);
      setTask("");
      setActiveSessionId(null);
    } else {
      if (!task.trim() || !contractId) return;
      const session = await startTimer.mutateAsync({
        contractId,
        taskDescription: task,
      });
      setActiveSessionId((session as any)?.id ?? null);
      setRunning(true);
    }
  }

  const timerBusy = startTimer.isPending || stopTimer.isPending;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Time Tracker</H1>
          <Muted className="truncate">Log billable hours with precision. Every minute is money.</Muted>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CsvImportExport resource="time" />
          <Button className="gap-2 font-semibold px-5 w-full sm:w-auto" variant="outline" onClick={() => setManualModalOpen(true)}>
            <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Manual Entry
          </Button>
        </div>
      </div>

      {/* Live Timer Card */}
      <Surface className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between min-w-0">
          {/* Clock Display */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <div className={cn(
              "relative h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-md flex items-center justify-center transition-colors",
              running ? "bg-zinc-900" : "bg-zinc-100"
            )}>
              <Timer
                className={cn("h-6 w-6 sm:h-7 sm:w-7", running ? "text-white" : "text-zinc-400")}
                strokeWidth={1.5}
              />
              {running && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-zinc-900 border-2 border-white">
                  <span className="absolute inset-0 rounded-full bg-zinc-400 animate-ping" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[clamp(2rem,6vw,3rem)] leading-none font-bold tracking-tighter text-zinc-900 tabular-nums truncate">
                {fmt(elapsed)}
              </div>
              <Muted className="text-[10px] uppercase tracking-widest mt-1 sm:mt-2 truncate block">
                {running ? "Recording…" : "Ready to start"}
              </Muted>
            </div>
          </div>

          {/* Task Input + Controls */}
          <div className="flex flex-col gap-3 sm:items-end w-full sm:w-auto shrink-0">
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              disabled={running}
              className="w-full sm:w-72 h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60"
            >
              <option value="">
                {billableContracts.length === 0 ? "No active contracts" : "Select contract…"}
              </option>
              {billableContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — {c.client}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What are you working on?"
              disabled={running}
              className="w-full sm:w-72 h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60"
            />
            <Button
              onClick={handleToggle}
              disabled={timerBusy || (!running && (!task.trim() || !contractId))}
              className={cn("w-full sm:w-auto gap-2 font-semibold px-6 shrink-0", running && "bg-zinc-700 hover:bg-zinc-600")}
            >
              {running ? (
                <><Square className="h-4 w-4 shrink-0" strokeWidth={1.5} /> Stop</>
              ) : (
                <><Play className="h-4 w-4 shrink-0" strokeWidth={1.5} /> Start Timer</>
              )}
            </Button>
          </div>
        </div>
      </Surface>

      {/* Weekly Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {weeklyMetrics.map((m) => (
          <Surface key={m.label} className="p-5 flex flex-col min-w-0">
            <div className="flex items-center justify-between pb-2 gap-2 min-w-0">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">{m.label}</Muted>
              <m.icon className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">{m.value}</div>
            <Muted className="text-[10px] mt-1 line-clamp-2">{m.sub}</Muted>
          </Surface>
        ))}
      </div>

      {/* Recent Entries Table */}
      <div className="space-y-3">
        <H2 className="text-base">Recent Entries</H2>
        <Surface className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-4 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => (allSelected ? clearSelection() : selectAll())}
                      aria-label="Select all"
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                    />
                  </th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Task</th>
                  <th className="px-4 py-4 hidden sm:table-cell text-[10px] uppercase tracking-widest font-bold text-zinc-500">Date</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Duration</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Total</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="px-4 py-4"><Skeleton className="h-5 w-40" /></td>
                      <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-14" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-7 w-20" /></td>
                    </tr>
                  ))
                ) : recentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                        </div>
                        <Muted className="text-sm">No time entries yet. Start the timer to log your first entry.</Muted>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-4 py-4 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                          aria-label={`Select ${entry.task}`}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                        />
                      </td>
                      <td className="px-4 py-4 max-w-[150px] sm:max-w-[200px]">
                        <span className="font-medium text-zinc-900 text-sm truncate block min-w-0">{entry.task}</span>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <Badge variant="outline" className="border-zinc-200 text-zinc-500 bg-transparent text-[10px] font-medium capitalize shrink-0 whitespace-nowrap">
                          {entry.date}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-medium text-zinc-900 shrink-0 whitespace-nowrap">{entry.duration}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-zinc-900 shrink-0 whitespace-nowrap">{entry.total}</span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-4">
                        <EntryActions entry={entry} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      {/* ── Manual Entry Modal ─────────────────── */}
      {manualModalOpen && (
        <ManualEntryModal onClose={() => setManualModalOpen(false)} />
      )}

      <BulkActionBar
        resource="time"
        count={selectedIds.length}
        ids={selectedIds}
        onClear={clearSelection}
        onDone={() => refetchEntries()}
      />
    </div>
  );
}

/* ── ManualEntryModal ─────────────────────────────── */

function ManualEntryModal({ onClose }: { onClose: () => void }) {
  const { data: contracts = [] } = useContracts();
  const createEntry = useCreateManualEntry();

  const today = new Date().toISOString().split("T")[0];
  const [contractId, setContractId]     = React.useState("");
  const [description, setDescription]   = React.useState("");
  const [date, setDate]                 = React.useState(today);
  const [startTime, setStartTime]       = React.useState("09:00");
  const [endTime, setEndTime]           = React.useState("10:00");
  const [hourlyRate, setHourlyRate]     = React.useState("");
  const [error, setError]               = React.useState<string | null>(null);

  // Active contracts for the dropdown
  const activeContracts = contracts.filter(
    (c) => c.status === "active" || c.status === "pending"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractId) { setError("Select a contract"); return; }
    setError(null);
    try {
      await createEntry.mutateAsync({
        contractId,
        taskDescription: description.trim(),
        date,
        startTime,
        endTime,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={() => !createEntry.isPending && onClose()} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-zinc-900">Log time manually</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Record hours without running the timer.</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Contract</label>
            <select
              required
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <option value="">Select contract…</option>
              {activeContracts.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
              {activeContracts.length === 0 && contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Task description</label>
            <input
              required
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Designed hero section"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Date</label>
              <input
                required type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">Start time</label>
                <input
                  required type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">End time</label>
                <input
                  required type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Hourly rate <span className="text-zinc-400 font-normal">(optional)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <input
                type="number" min="0" step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0.00"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white pl-7 pr-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={createEntry.isPending}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9" disabled={createEntry.isPending}>
              {createEntry.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Save entry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
