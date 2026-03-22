"use client";

import * as React from "react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════ */

const recentEntries = [
  { id: "1", task: "UI Design — Acme E-commerce", project: "Website Overhaul", client: "Acme Corp",  duration: "3h 15m", date: "Today",     rate: "$150/hr", total: "$487.50" },
  { id: "2", task: "Backend API Integration",      project: "Dashboard Platform", client: "Terra Finance", duration: "2h 00m", date: "Today",     rate: "$150/hr", total: "$300.00" },
  { id: "3", task: "Strategy & Discovery Call",   project: "Website Overhaul", client: "Acme Corp",  duration: "1h 00m", date: "Yesterday", rate: "$150/hr", total: "$150.00" },
  { id: "4", task: "Wireframes v2 Revisions",     project: "Mobile App",       client: "Orbit Systems", duration: "4h 30m", date: "Yesterday", rate: "$150/hr", total: "$675.00" },
  { id: "5", task: "Client Onboarding Email",     project: "Website Overhaul", client: "Acme Corp",  duration: "0h 45m", date: "Mar 19",    rate: "$150/hr", total: "$112.50" },
];

const weeklyMetrics = [
  { label: "Hours This Week",  value: "28h 45m", sub: "+4h vs last week",   icon: Clock     },
  { label: "Billable Hours",   value: "24h 30m", sub: "85% billable rate",  icon: DollarSign },
  { label: "Revenue Logged",   value: "$3,675",  sub: "This week",          icon: BarChart2  },
  { label: "Avg Daily Hours",  value: "5h 45m",  sub: "Mon – Fri",          icon: Calendar   },
];

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function TimePage() {
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [task, setTask]       = React.useState("");

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

  function handleToggle() {
    if (running) {
      setRunning(false);
      setElapsed(0);
      setTask("");
    } else {
      setRunning(true);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Time Tracker</H1>
          <Muted className="break-words">Log billable hours with precision. Every minute is money.</Muted>
        </div>
        <Button className="gap-2 font-semibold px-5 w-full sm:w-auto shrink-0" variant="outline">
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          Manual Entry
        </Button>
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
            <Muted className="text-[10px] mt-1 break-words line-clamp-2">{m.sub}</Muted>
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
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Task</th>
                  <th className="px-4 py-4 hidden sm:table-cell text-[10px] uppercase tracking-widest font-bold text-zinc-500">Project / Client</th>
                  <th className="px-4 py-4 hidden md:table-cell text-[10px] uppercase tracking-widest font-bold text-zinc-500">Date</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Duration</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Total</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-4 py-4 max-w-[150px] sm:max-w-[200px]">
                    <span className="font-medium text-zinc-900 text-sm truncate block min-w-0">{entry.task}</span>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell max-w-[150px] sm:max-w-[200px]">
                    <div className="text-sm text-zinc-900 truncate min-w-0">{entry.project}</div>
                    <div className="text-xs text-zinc-400 truncate min-w-0">{entry.client}</div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
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
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Surface>
      </div>
    </div>
  );
}
