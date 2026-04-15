"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  FileText,
  Clock,
  UserPlus,
  FolderPlus,
  FilePlus,
  Video,
  DollarSign,
  Bell,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useDashboardStats } from "@/lib/queries/dashboard";

const quickActions = [
  { label: "New Client", icon: UserPlus, href: "/clients" },
  { label: "New Project", icon: FolderPlus, href: "/projects" },
  { label: "New File", icon: FilePlus, href: "/contracts" },
  { label: "New Meeting", icon: Video, href: "/pipeline" },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  const notificationMetrics = [
    { label: "Unread Notifications", value: isLoading ? "—" : String(stats?.unreadNotifications ?? 0), icon: Bell },
    { label: "Active Contracts", value: isLoading ? "—" : String(stats?.activeContractsCount ?? 0), icon: TrendingUp },
    { label: "In Escrow", value: isLoading ? "—" : fmt(stats?.escrowHeld ?? 0), icon: ShieldCheck },
    { label: "Available Balance", value: isLoading ? "—" : fmt(stats?.availableBalance ?? 0), icon: DollarSign },
  ];

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
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 gap-2"
              >
                <action.icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden lg:inline text-xs font-medium">{action.label}</span>
              </Button>
            </Link>
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
              {isLoading ? (
                <Skeleton className="h-5 w-16 mb-1" />
              ) : (
                <div className="text-[clamp(1.125rem,2vw,1.25rem)] font-bold tracking-tighter text-zinc-900 truncate">
                  {metric.value}
                </div>
              )}
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold leading-none truncate block mt-1">
                {metric.label}
              </Muted>
            </div>
          </Surface>
        ))}
      </div>

      {/* Row 1: The Ledger */}
      <div className="space-y-4">
        <H2>The Ledger</H2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Net Revenue (YTD) */}
          <Surface className="p-6">
            <div className="flex items-center justify-between pb-2 gap-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Net Revenue (YTD)</Muted>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">
                {fmt(stats?.completedRevenue ?? 0)}
              </div>
            )}
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
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">
                {fmt(stats?.escrowHeld ?? 0)}
              </div>
            )}
            <Muted className="mt-1 text-[10px] uppercase tracking-wider truncate">Stripe Connect Verified</Muted>
          </Surface>

          {/* Awaiting Release */}
          <Surface className="p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Pending Release</Muted>
                <div className="h-2 w-2 rounded-full bg-zinc-900 shrink-0" />
              </div>
              <FileText className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">
                {fmt(stats?.pendingBalance ?? 0)}
              </div>
            )}
            <Muted className="mt-1 text-[10px] uppercase tracking-wider text-zinc-900 font-bold truncate">
              Wallet Balance
            </Muted>
          </Surface>

          {/* Effective Hourly Rate */}
          <Surface className="p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 gap-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Hourly Margin</Muted>
              <Clock className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter text-zinc-900 truncate">
                ${stats?.effectiveHourlyRate ?? 0}/hr
              </div>
            )}
            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">
              <span className="truncate">Across logged time entries</span>
            </div>
          </Surface>
        </div>
      </div>

      {/* Row 2: Active Contracts + Action Center */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Active Contracts (60%) */}
        <div className="md:col-span-7 space-y-4">
          <H2>Active Contracts</H2>
          <Surface className="divide-y divide-zinc-100">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="p-6 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (stats?.activeContracts ?? []).length === 0 ? (
              <div className="p-6 text-center">
                <Muted className="text-sm">No active contracts yet.</Muted>
              </div>
            ) : (
              (stats?.activeContracts ?? []).map((contract) => (
                <div key={contract.id} className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 pr-2">
                      <Muted className="text-xs uppercase tracking-widest leading-none mb-1 truncate block">
                        {contract.status.replace(/_/g, " ")}
                      </Muted>
                      <div className="font-semibold text-zinc-900 tracking-tight text-lg truncate">
                        {contract.title}
                      </div>
                    </div>
                    <Link href={`/contracts/${contract.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold border-zinc-200 hover:bg-zinc-50 transition-colors shrink-0"
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                  <div className="h-[2px] w-full bg-zinc-100" />
                </div>
              ))
            )}
          </Surface>
        </div>

        {/* Action Center (40%) */}
        <div className="md:col-span-5 space-y-4">
          <H2>Action Center</H2>
          <Surface className="p-6">
            <div className="space-y-6">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))
              ) : (stats?.recentNotifications ?? []).length === 0 ? (
                <Muted className="text-sm">No recent notifications.</Muted>
              ) : (
                (stats?.recentNotifications ?? []).map((n) => (
                  <div key={n.id} className="space-y-1">
                    <P className={`text-sm leading-snug font-medium truncate ${n.is_read ? "text-zinc-500" : "text-zinc-900"}`}>
                      {n.title}
                    </P>
                    <Muted className="text-[10px] uppercase tracking-widest block">
                      {timeAgo(n.created_at)}
                    </Muted>
                  </div>
                ))
              )}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
