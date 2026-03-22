"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  PiggyBank,
  Calculator,
  TrendingUp,
  Clock,
  Receipt,
  ArrowUpRight,
} from "lucide-react";

const taxBuckets = [
  { label: "Federal Tax Reserve", amount: "$12,445", percentage: "10%", fill: 45 },
  { label: "State Tax Reserve", amount: "$6,222", percentage: "5%", fill: 30 },
  { label: "Self-Employment Tax", amount: "$18,997", percentage: "15.3%", fill: 65 },
];

const quarterlyEstimates = [
  { quarter: "Q1 2026", due: "Apr 15", amount: "$9,416", status: "upcoming" },
  { quarter: "Q2 2026", due: "Jun 15", amount: "$9,416", status: "future" },
  { quarter: "Q3 2026", due: "Sep 15", amount: "$9,416", status: "future" },
  { quarter: "Q4 2026", due: "Jan 15", amount: "$9,416", status: "future" },
];

const expenseCategories = [
  { category: "Software & Tools", amount: "$2,400", transactions: 18 },
  { category: "Contractors", amount: "$8,500", transactions: 6 },
  { category: "Office & Equipment", amount: "$1,200", transactions: 4 },
  { category: "Travel", amount: "$950", transactions: 3 },
  { category: "Professional Services", amount: "$3,200", transactions: 2 },
];

const projectRates = [
  { project: "E-commerce Redesign", client: "Acme Corp", rate: "$210/hr", hours: "88h", revenue: "$18,500" },
  { project: "SaaS Dashboard Audit", client: "Orbit Systems", rate: "$163/hr", hours: "60h", revenue: "$9,800" },
  { project: "Marketing Platform", client: "Terra Finance", rate: "$183/hr", hours: "120h", revenue: "$22,000" },
];

export default function ProfitabilityPage() {
  const totalExpenses = expenseCategories.reduce((s, e) => s + parseInt(e.amount.replace(/[$,]/g, "")), 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="min-w-0">
        <H1 className="truncate">Profitability</H1>
        <Muted className="truncate">Tax planning, expenses, and per-project margins.</Muted>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Surface className="p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2 gap-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Net Income (YTD)</Muted>
            <TrendingUp className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          <div className="font-bold tracking-tighter text-zinc-900 truncate max-w-full" style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}>$108,200</div>
          <Muted className="text-[10px] mt-1 truncate max-w-full">Revenue minus expenses</Muted>
        </Surface>
        <Surface className="p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2 gap-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Total Expenses (YTD)</Muted>
            <Receipt className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          <div className="font-bold tracking-tighter text-zinc-900 truncate max-w-full" style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}>${totalExpenses.toLocaleString()}</div>
          <Muted className="text-[10px] mt-1 truncate max-w-full">{expenseCategories.reduce((s, e) => s + e.transactions, 0)} transactions</Muted>
        </Surface>
        <Surface className="p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2 gap-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Tax Set Aside</Muted>
            <PiggyBank className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          <div className="font-bold tracking-tighter text-zinc-900 truncate max-w-full" style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}>$37,664</div>
          <Muted className="text-[10px] mt-1 truncate max-w-full">30.3% of net income</Muted>
        </Surface>
      </div>

      {/* Tax Buckets + Quarterly Estimates */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Tax Savings Buckets */}
        <div className="md:col-span-7 space-y-4">
          <H2>Tax Savings Buckets</H2>
          <Surface className="divide-y divide-zinc-100">
            {taxBuckets.map((bucket, i) => (
              <div key={i} className="p-6 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 tracking-tight truncate">{bucket.label}</div>
                    <Muted className="text-[10px] uppercase tracking-widest truncate">{bucket.percentage} of net income</Muted>
                  </div>
                  <div className="text-lg font-bold text-zinc-900 shrink-0">{bucket.amount}</div>
                </div>
                <div className="h-[2px] w-full bg-zinc-100">
                  <div className="h-full bg-zinc-900" style={{ width: `${bucket.fill}%` }} />
                </div>
              </div>
            ))}
          </Surface>
        </div>

        {/* Quarterly Tax Estimates */}
        <div className="md:col-span-5 space-y-4">
          <H2>Quarterly Estimates</H2>
          <Surface className="divide-y divide-zinc-100">
            {quarterlyEstimates.map((q, i) => (
              <div key={i} className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 tracking-tight truncate">{q.quarter}</div>
                  <Muted className="text-xs truncate">Due {q.due}</Muted>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="font-medium text-zinc-900">{q.amount}</div>
                  {q.status === "upcoming" && (
                    <Badge variant="outline" className="border-zinc-200 text-zinc-900 bg-transparent font-bold text-[10px]">
                      Next
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </Surface>
        </div>
      </div>

      <Separator />

      {/* Expense Categories + Project Rates */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Expense Breakdown */}
        <div className="md:col-span-6 space-y-4">
          <H2>Expense Categories</H2>
          <Surface className="divide-y divide-zinc-100">
            {expenseCategories.map((cat, i) => (
              <div key={i} className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 tracking-tight text-sm truncate">{cat.category}</div>
                  <Muted className="text-[10px] uppercase tracking-widest truncate">{cat.transactions} transactions</Muted>
                </div>
                <div className="font-medium text-zinc-900 shrink-0">{cat.amount}</div>
              </div>
            ))}
          </Surface>
        </div>

        {/* Effective Hourly Rate by Project */}
        <div className="md:col-span-6 space-y-4">
          <H2>Hourly Rate by Project</H2>
          <Surface className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Project</th>
                    <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Rate</th>
                    <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {projectRates.map((pr, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 max-w-[150px] sm:max-w-xs w-full">
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-900 text-sm truncate">{pr.project}</div>
                          <Muted className="text-[10px] truncate">{pr.client} · {pr.hours}</Muted>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-bold text-zinc-900 text-sm">{pr.rate}</td>
                      <td className="px-5 py-3 text-right text-sm text-zinc-600">{pr.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
