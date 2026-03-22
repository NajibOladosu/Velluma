"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  ShieldCheck,
  FileText,
  Clock,
  ArrowUpRight,
  Plus,
  UserPlus,
  FolderPlus,
  FilePlus,
  Video,
  Mail,
  CheckSquare,
  DollarSign,
} from "lucide-react";

const quickActions = [
  { label: "New Client", icon: UserPlus, href: "/clients/new" },
  { label: "New Project", icon: FolderPlus, href: "/projects/new" },
  { label: "New File", icon: FilePlus, href: "/proposals/new" },
  { label: "New Meeting", icon: Video, href: "/meetings/new" },
];

const notificationMetrics = [
  { label: "Unread Messages", value: "7", icon: Mail },
  { label: "New Leads", value: "3", icon: TrendingUp },
  { label: "Assigned Tasks", value: "12", icon: CheckSquare },
  { label: "YTD Bookings", value: "$142K", icon: DollarSign },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* Header + Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <H1 className="truncate">Dashboard</H1>
          <Muted className="truncate">Business at a glance.</Muted>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="h-9 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 gap-2"
            >
              <action.icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden lg:inline text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Notification Metrics Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {notificationMetrics.map((metric) => (
          <Surface key={metric.label} className="p-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-md bg-zinc-50 flex items-center justify-center flex-shrink-0">
              <metric.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="text-[clamp(1.125rem,2vw,1.25rem)] font-bold tracking-tighter text-zinc-900 truncate">{metric.value}</div>
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold leading-none truncate block mt-1">{metric.label}</Muted>
            </div>
          </Surface>
        ))}
      </div>

      {/* Row 1: The Ledger (High-Level Finance) */}
      <div className="space-y-4">
        <H2>The Ledger</H2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Net Revenue (YTD) */}
          <Surface className="p-6">
            <div className="flex items-center justify-between pb-2 gap-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Net Revenue (YTD)</Muted>
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">$124,450</div>
            <div className="mt-4 h-[1px] w-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-zinc-300 w-[60%]" />
            </div>
          </Surface>

          {/* Protected in Escrow */}
          <Surface className="p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 gap-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Protected in Escrow</Muted>
              <ShieldCheck className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">$12,200</div>
            <Muted className="mt-1 text-[10px] uppercase tracking-wider truncate">Stripe Connect Verified</Muted>
          </Surface>

          {/* Awaiting Payment */}
          <Surface className="p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Awaiting Payment</Muted>
                <div className="h-2 w-2 rounded-full bg-zinc-900 shrink-0" />
              </div>
              <FileText className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">$8,150</div>
            <Muted className="mt-1 text-[10px] uppercase tracking-wider text-zinc-900 font-bold truncate">3 Overdue</Muted>
          </Surface>

          {/* Effective Hourly Margin */}
          <Surface className="p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 gap-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Hourly Margin</Muted>
              <Clock className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
            </div>
            <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">$185/hr</div>
            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">
              <span className="truncate">Across active contracts</span>
            </div>
          </Surface>
        </div>
      </div>

      {/* Row 2: Active Operations (Execution) */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Active Milestones (60%) */}
        <div className="md:col-span-7 space-y-4">
          <H2>Active Milestones</H2>
          <Surface className="divide-y divide-zinc-100">
            {[
              { client: "Vesper AI", milestone: "Brand Strategy Implementation", progress: 65 },
              { client: "Orbit Systems", milestone: "NodeJS Infrastructure Audit", progress: 30 },
              { client: "Acme Corp", milestone: "UI Design Phase 2", progress: 95 },
            ].map((item, i) => (
              <div key={i} className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <Muted className="text-xs uppercase tracking-widest leading-none mb-1 truncate block">{item.client}</Muted>
                    <div className="font-semibold text-zinc-900 tracking-tight text-lg truncate">{item.milestone}</div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold border-zinc-200 hover:bg-zinc-50 transition-colors shrink-0">
                    Request Approval
                  </Button>
                </div>
                <div className="h-[2px] w-full bg-zinc-100">
                  <div
                    className="h-full bg-zinc-900 transition-all duration-500"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </Surface>
        </div>

        {/* Action Center (40%) */}
        <div className="md:col-span-5 space-y-4">
          <H2>Action Center</H2>
          <Surface className="p-6">
            <div className="space-y-6">
              {[
                { message: "Review Acme Corp signed contract.", time: "2m ago" },
                { message: "Milestone 2 approved. Transferring $2,500 from escrow.", time: "1h ago" },
                { message: "Client Vesper AI viewed proposal for \"Marketing Kit\"", time: "4h ago" },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <P className="text-sm leading-snug text-zinc-900 font-medium truncate">
                    {item.message}
                  </P>
                  <Muted className="text-[10px] uppercase tracking-widest block">
                    {item.time}
                  </Muted>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
