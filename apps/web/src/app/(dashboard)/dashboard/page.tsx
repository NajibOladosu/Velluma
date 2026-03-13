"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  FileText,
  CheckCircle2,
  ArrowUpRight
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div>
        <H1>Dashboard</H1>
        <Muted>Business at a glance.</Muted>
      </div>

      {/* The Pulse (Bento Grid) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Total Revenue</Muted>
            <TrendingUp className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$12,450.00</div>
          {/* Minimalist Revenue Line */}
          <div className="mt-4 h-[1px] w-full bg-zinc-100 relative">
            <div className="absolute inset-0 bg-blue-500 w-[70%]" />
          </div>
        </Surface>

        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">In Escrow</Muted>
            <Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$4,200.00</div>
          <Muted className="mt-1 text-[10px] uppercase tracking-wider">Awaiting Milestone #4</Muted>
        </Surface>

        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Outstanding</Muted>
            <FileText className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$2,150.00</div>
          <Muted className="mt-1 text-[10px] uppercase tracking-wider">3 Overdue</Muted>
        </Surface>

        <Surface className="p-6">
          <div className="flex items-center justify-between pb-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold">Rate (Effective)</Muted>
            <TrendingUp className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900">$145/hr</div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-wider">
            <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
            <span>+8% optimized</span>
          </div>
        </Surface>
      </div>

      {/* Middle Row: Active Milestones & Action Center */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Active Milestones (Left) */}
        <div className="md:col-span-7 space-y-4">
          <H2>Active Milestones</H2>
          <Surface className="divide-y divide-zinc-100">
            {[
              { name: "Brand Strategy Implementation", client: "Vesper AI", progress: 65 },
              { name: "NodeJS Infrastructure Audit", client: "Orbit Systems", progress: 30 },
              { name: "UI Design Phase 2", client: "Acme Corp", progress: 90 },
            ].map((item, i) => (
              <div key={i} className="p-6 space-y-3 group cursor-pointer hover:bg-zinc-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900 tracking-tight">{item.name}</div>
                    <Muted className="text-xs">{item.client}</Muted>
                  </div>
                  <Badge variant="outline" className="font-medium px-2 py-0 h-5">Active</Badge>
                </div>
                {/* 2px monochrome progress bar */}
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

        {/* Action Center (Right) */}
        <div className="md:col-span-5 space-y-4">
          <H2>Action Center</H2>
          <Surface className="p-6">
            <div className="space-y-6">
              {[
                { message: "Client Vesper AI viewed proposal for \"Marketing Kit\"", time: "2m ago" },
                { message: "Escrow funds cleared for Milestone #2 ($1,200)", time: "1h ago" },
                { message: "New change request from Acme Corp on Contract #104", time: "4h ago" },
                { message: "You marked Milestone #3 as delivered to Orbit Systems", time: "1d ago" },
              ].map((item, i) => (
                <div key={i} className="relative pl-4 border-l border-zinc-200">
                  <P className="text-sm leading-tight text-zinc-900">
                    {item.message}
                  </P>
                  <Muted className="text-[10px] uppercase tracking-widest mt-1 block">
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
