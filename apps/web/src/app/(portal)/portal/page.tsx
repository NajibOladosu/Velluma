"use client";

import * as React from "react";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  FileText,
  MessageSquare,
  Clock,
  DollarSign,
  Download,
  Upload,
  Send,
  CheckCircle2,
  Circle,
  ArrowUpRight,
} from "lucide-react";

const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "tasks", label: "Tasks", icon: CheckCircle2 },
  { key: "billing", label: "Billing", icon: DollarSign },
  { key: "messages", label: "Messages", icon: MessageSquare },
] as const;

type TabKey = typeof tabs[number]["key"];

/* ─── Overview Tab ─── */
function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Progress Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Project Progress</Muted>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900 mt-2">64%</div>
          <div className="h-[2px] w-full bg-zinc-100 mt-3">
            <div className="h-full bg-zinc-900" style={{ width: "64%" }} />
          </div>
        </Surface>
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Next Milestone</Muted>
          <div className="text-sm font-bold text-zinc-900 mt-2">Backend Integration</div>
          <Muted className="text-[10px] mt-1">ETA: Mar 18, 2026</Muted>
        </Surface>
        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Escrow Held</Muted>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900 mt-2">$5,500</div>
          <Muted className="text-[10px] mt-1">Stripe Connect Verified</Muted>
        </Surface>
      </div>

      {/* Timeline + Documents */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-7 space-y-4">
          <H3 className="text-base font-semibold">Activity Timeline</H3>
          <Surface className="p-5">
            <div className="space-y-5">
              {[
                { action: "Milestone 2 delivered for review", time: "2h ago", type: "milestone" },
                { action: "New assets uploaded to shared vault", time: "1d ago", type: "file" },
                { action: "Payment of $2,500 released from escrow", time: "3d ago", type: "payment" },
                { action: "Milestone 1 approved by you", time: "1w ago", type: "approval" },
                { action: "Contract signed by both parties", time: "2w ago", type: "contract" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <P className="text-sm leading-snug text-zinc-900 font-medium">{item.action}</P>
                    <Muted className="text-[10px] uppercase tracking-widest">{item.time}</Muted>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        </div>

        <div className="md:col-span-5 space-y-4">
          <H3 className="text-base font-semibold">Shared Documents</H3>
          <Surface className="divide-y divide-zinc-100">
            {[
              { name: "Brand Guidelines v2.pdf", size: "4.2 MB" },
              { name: "UI Mockups Final.fig", size: "12 MB" },
              { name: "Service Agreement.pdf", size: "240 KB" },
            ].map((doc, i) => (
              <div key={i} className="p-4 flex items-center justify-between group cursor-pointer hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <P className="text-sm font-medium">{doc.name}</P>
                    <Muted className="text-[10px]">{doc.size}</Muted>
                  </div>
                </div>
                <Download className="h-4 w-4 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
              </div>
            ))}
          </Surface>
        </div>
      </div>
    </div>
  );
}

/* ─── Tasks Tab ─── */
function TasksTab() {
  const milestones = [
    { name: "Discovery & Research", status: "completed", dueDate: "Feb 28" },
    { name: "UI Design Phase 1", status: "completed", dueDate: "Mar 05" },
    { name: "Backend Integration", status: "in-progress", dueDate: "Mar 18" },
    { name: "Testing & QA", status: "upcoming", dueDate: "Mar 25" },
    { name: "Launch & Handoff", status: "upcoming", dueDate: "Apr 01" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H3 className="text-base font-semibold">Milestones</H3>
        <Muted className="text-xs">Showing client-visible milestones only.</Muted>
      </div>
      <Surface className="divide-y divide-zinc-100">
        {milestones.map((m, i) => (
          <div key={i} className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {m.status === "completed" ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-zinc-900" strokeWidth={2} />
              ) : m.status === "in-progress" ? (
                <Clock className="h-4.5 w-4.5 text-zinc-500" strokeWidth={1.5} />
              ) : (
                <Circle className="h-4.5 w-4.5 text-zinc-300" strokeWidth={1.5} />
              )}
              <div>
                <P className={cn("text-sm font-medium", m.status === "completed" ? "text-zinc-400 line-through" : "text-zinc-900")}>
                  {m.name}
                </P>
                <Muted className="text-[10px] uppercase tracking-widest">Due {m.dueDate}</Muted>
              </div>
            </div>
            <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium text-[10px] uppercase tracking-widest">
              {m.status === "in-progress" ? "In Progress" : m.status === "completed" ? "Done" : "Upcoming"}
            </Badge>
          </div>
        ))}
      </Surface>
    </div>
  );
}

/* ─── Billing Tab ─── */
function BillingTab() {
  const payments = [
    { label: "Deposit: Design Phase", amount: "$2,500", date: "Mar 01", status: "Released" },
    { label: "Milestone 1: Research", amount: "$1,500", date: "Mar 05", status: "Released" },
    { label: "Milestone 2: Backend", amount: "$3,000", date: "Mar 18", status: "Secured" },
    { label: "Final: Delivery", amount: "$2,000", date: "Apr 01", status: "Pending" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H3 className="text-base font-semibold">Payment Schedule</H3>
        <Button variant="outline" size="sm" className="border-zinc-200 text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download All Receipts
        </Button>
      </div>
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Description</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Date</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Amount</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.map((p, i) => (
                <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">{p.label}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{p.date}</td>
                  <td className="px-6 py-4 font-medium text-zinc-900">{p.amount}</td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant="outline" className={cn(
                      "border-zinc-200 bg-transparent font-medium",
                      p.status === "Released" ? "text-zinc-500" : p.status === "Secured" ? "text-zinc-900 font-bold" : "text-zinc-400"
                    )}>
                      {p.status}
                    </Badge>
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

/* ─── Messages Tab ─── */
function MessagesTab() {
  const messages = [
    { from: "Najib O.", content: "Hey! Just uploaded the latest mockups to the vault. Take a look when you get a chance.", time: "2h ago", isAgent: true },
    { from: "You", content: "These look great! Can we adjust the hero section color to match the updated brand guidelines?", time: "1h ago", isAgent: false },
    { from: "Najib O.", content: "Absolutely. I'll push an update by end of day.", time: "45m ago", isAgent: true },
  ];

  return (
    <div className="space-y-6">
      {/* Messages List */}
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.isAgent ? "justify-start" : "justify-end")}>
            <div className={cn("max-w-md space-y-1", msg.isAgent ? "" : "text-right")}>
              <div className="flex items-center gap-2">
                {msg.isAgent && (
                  <div className="h-6 w-6 rounded bg-zinc-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-zinc-600">NO</span>
                  </div>
                )}
                <span className="text-xs font-medium text-zinc-900">{msg.from}</span>
                <Muted className="text-[10px]">{msg.time}</Muted>
              </div>
              <Surface className={cn("p-4 inline-block text-left", msg.isAgent ? "" : "bg-zinc-50")}>
                <P className="text-sm text-zinc-700 leading-relaxed">{msg.content}</P>
              </Surface>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-10 w-10 border-zinc-200 flex-shrink-0">
          <Upload className="h-4 w-4 text-zinc-400" />
        </Button>
        <Input
          placeholder="Type a message..."
          className="h-10 bg-white border-zinc-200 text-sm flex-1"
        />
        <Button size="icon" className="h-10 w-10 flex-shrink-0">
          <Send className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

/* ─── Main Portal Page ─── */
export default function ClientPortalPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");

  const tabContent: Record<TabKey, React.ReactNode> = {
    overview: <OverviewTab />,
    tasks: <TasksTab />,
    billing: <BillingTab />,
    messages: <MessagesTab />,
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
      {/* Client Identity & Trust Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-md bg-zinc-900 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <H1 className="text-2xl">E-commerce Redesign</H1>
            <Muted>Acme Corp · Secured environment</Muted>
          </div>
        </div>
        <Badge variant="outline" className="border-zinc-200 text-zinc-900 bg-transparent font-bold">
          Active
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-[1px]",
              activeTab === tab.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tabContent[activeTab]}

      {/* Trust Footer */}
      <div className="text-center pt-6">
        <Muted className="text-[10px] uppercase tracking-widest leading-loose">
          All transactions are secured by 256-bit encryption. <br />
          Velluma Dispute Resolution is active for this project.
        </Muted>
      </div>
    </div>
  );
}
