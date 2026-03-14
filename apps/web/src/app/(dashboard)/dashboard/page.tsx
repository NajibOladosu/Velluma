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
  Search,
  CheckCircle2
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div>
        <H1>Dashboard</H1>
        <Muted>Business at a glance.</Muted>
      </div>

      {/* Row 1: The Ledger (High-Level Finance) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Net Revenue (YTD) */}
        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Net Revenue (YTD)</Muted>
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$124,450.00</div>
          {/* 1px gray sparkline line */}
          <div className="mt-4 h-[1px] w-full bg-zinc-100 overflow-hidden">
            <div className="h-full bg-zinc-300 w-[60%] animate-pulse" />
          </div>
        </Surface>

        {/* Protected in Escrow */}
        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Protected in Escrow</Muted>
            <ShieldCheck className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$12,200.00</div>
          <Muted className="mt-1 text-[10px] uppercase tracking-wider">Stripe Connect Verified</Muted>
        </Surface>

        {/* Awaiting Payment */}
        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Awaiting Payment</Muted>
              <div className="h-2 w-2 rounded-full bg-zinc-900" /> {/* Late badge */}
            </div>
            <FileText className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$8,150.00</div>
          <Muted className="mt-1 text-[10px] uppercase tracking-wider text-zinc-900 font-bold">3 Overdue</Muted>
        </Surface>

        {/* Effective Hourly Margin */}
        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Hourly Margin</Muted>
            <Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$185/hr</div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            <span>Across active contracts</span>
          </div>
        </Surface>
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
                <div className="flex items-center justify-between">
                  <div>
                    <Muted className="text-xs uppercase tracking-widest leading-none mb-1">{item.client}</Muted>
                    <div className="font-semibold text-zinc-900 tracking-tight text-lg">{item.milestone}</div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold border-zinc-200 hover:bg-zinc-50 transition-colors">
                    Request Approval
                  </Button>
                </div>
                {/* 2px black progress bar */}
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
                  <P className="text-sm leading-snug text-zinc-900 font-medium">
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
