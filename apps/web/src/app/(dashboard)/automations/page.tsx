"use client";

import * as React from "react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { H1, H2, Muted, P } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import {
  Zap,
  Plus,
  Mail,
  Clock,
  FileText,
  CreditCard,
  Bell,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Repeat,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES & DATA
   ═══════════════════════════════════════════════════════ */

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  enabled: boolean;
  runs: number;
  icon: React.ElementType;
}

const automations: Automation[] = [
  {
    id: "1",
    name: "Invoice Overdue Reminder",
    description: "Automatically nudge clients 3 days after an invoice goes overdue.",
    trigger: "Invoice → Overdue (3 days)",
    action: "Send Email",
    enabled: true,
    runs: 14,
    icon: Mail,
  },
  {
    id: "2",
    name: "New Contract → Welcome Email",
    description: "Send a personalised welcome email when a contract is signed.",
    trigger: "Contract → Signed",
    action: "Send Email",
    enabled: true,
    runs: 8,
    icon: FileText,
  },
  {
    id: "3",
    name: "Weekly Time Summary",
    description: "Receive a Slack message every Monday with last week's logged hours.",
    trigger: "Schedule → Every Monday 8:00am",
    action: "Slack Notification",
    enabled: false,
    runs: 0,
    icon: Clock,
  },
  {
    id: "4",
    name: "Milestone Approved → Release Payment",
    description: "Automatically trigger escrow payout when a milestone is approved.",
    trigger: "Milestone → Approved",
    action: "Release Escrow",
    enabled: true,
    runs: 5,
    icon: CreditCard,
  },
  {
    id: "5",
    name: "Client Health Score Alert",
    description: "Get notified when a client's health score drops below 50.",
    trigger: "Health Score → < 50",
    action: "In-App Notification",
    enabled: false,
    runs: 2,
    icon: Bell,
  },
];

const templates = [
  { name: "Follow-up after proposal sent",      trigger: "Proposal Sent",   action: "Email (3 days later)"    },
  { name: "Recurring monthly retainer invoice", trigger: "Date (1st/month)", action: "Create & Send Invoice"  },
  { name: "Project complete → ask for referral", trigger: "Project → Done",  action: "Email + Review Request"  },
];

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function AutomationsPage() {
  const [items, setItems] = React.useState(automations);

  function toggleEnabled(id: string) {
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }

  const activeCount = items.filter((a) => a.enabled).length;
  const totalRuns   = items.reduce((s, a) => s + a.runs, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <H1>Automations</H1>
          <Muted>Put your business on autopilot. Set rules once, run forever.</Muted>
        </div>
        <Button className="gap-2 font-semibold px-5">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active Rules",    value: `${activeCount}`,   icon: Zap     },
          { label: "Total Runs",      value: `${totalRuns}`,     icon: Repeat  },
          { label: "Hours Saved",     value: "~6h / mo",         icon: Clock   },
        ].map((m) => (
          <Surface key={m.label} className="p-5">
            <div className="flex items-center justify-between pb-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">{m.label}</Muted>
              <m.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-bold tracking-tighter text-zinc-900">{m.value}</div>
          </Surface>
        ))}
      </div>

      {/* Active Automations */}
      <div className="space-y-3">
        <H2 className="text-base">Your Automations</H2>
        <div className="space-y-2">
          {items.map((automation) => {
            const Icon = automation.icon;
            return (
              <Surface
                key={automation.id}
                className={cn(
                  "p-5 flex items-center gap-5 transition-colors",
                  !automation.enabled && "opacity-60"
                )}
              >
                {/* Icon */}
                <div className="h-10 w-10 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-zinc-500" strokeWidth={1.5} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 tracking-tight truncate">
                      {automation.name}
                    </span>
                    {automation.runs > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        {automation.runs} runs
                      </span>
                    )}
                  </div>
                  <P className="text-xs text-zinc-500 truncate">{automation.description}</P>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge variant="outline" className="border-zinc-200 text-zinc-500 bg-transparent text-[9px] font-bold uppercase tracking-widest">
                      {automation.trigger}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-zinc-300" />
                    <Badge variant="outline" className="border-zinc-200 text-zinc-500 bg-transparent text-[9px] font-bold uppercase tracking-widest">
                      {automation.action}
                    </Badge>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleEnabled(automation.id)}
                  className="flex-shrink-0"
                  aria-label={automation.enabled ? "Disable automation" : "Enable automation"}
                >
                  {automation.enabled ? (
                    <ToggleRight className="h-7 w-7 text-zinc-900" strokeWidth={1.5} />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-zinc-300" strokeWidth={1.5} />
                  )}
                </button>
              </Surface>
            );
          })}
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <H2 className="text-base">Popular Templates</H2>
          <Button variant="ghost" size="sm" className="text-xs text-zinc-500 h-7">
            Browse all →
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {templates.map((tpl, i) => (
            <Surface
              key={i}
              className="p-5 cursor-pointer hover:border-zinc-300 transition-colors group space-y-3"
            >
              <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center">
                <Zap className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <P className="text-sm font-semibold text-zinc-900 leading-snug">{tpl.name}</P>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="border-zinc-200 text-zinc-400 bg-transparent text-[9px] font-bold uppercase">
                    {tpl.trigger}
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-zinc-300" />
                  <Badge variant="outline" className="border-zinc-200 text-zinc-400 bg-transparent text-[9px] font-bold uppercase">
                    {tpl.action}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-200 w-full">
                Use Template
              </Button>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}
