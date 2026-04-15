"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PiggyBank,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { useProfitabilityStats } from "@/lib/queries/dashboard";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtRate(minutes: number, earned: number) {
  if (minutes === 0) return "—";
  return `$${Math.round(earned / (minutes / 60))}/hr`;
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Quarterly US estimated tax due dates for 2026
const quarterlyDueDates = [
  { quarter: "Q1 2026", due: "Apr 15" },
  { quarter: "Q2 2026", due: "Jun 15" },
  { quarter: "Q3 2026", due: "Sep 15" },
  { quarter: "Q4 2026", due: "Jan 15" },
];

export default function ProfitabilityPage() {
  const { data: stats, isLoading } = useProfitabilityStats();

  // Tax estimates based on real net income (simplified: 30.3% effective rate)
  const taxRate = 0.303;
  const totalTax = Math.round((stats?.netIncome ?? 0) * taxRate);
  const quarterlyTax = Math.round(totalTax / 4);

  const federalTax = Math.round((stats?.netIncome ?? 0) * 0.22);
  const stateTax = Math.round((stats?.netIncome ?? 0) * 0.05);
  const seTax = Math.round((stats?.netIncome ?? 0) * 0.153);

  const maxTax = Math.max(federalTax, stateTax, seTax, 1);
  const taxBuckets = [
    { label: "Federal Tax Reserve", amount: federalTax, percentage: "22%", fill: Math.round((federalTax / maxTax) * 100) },
    { label: "State Tax Reserve", amount: stateTax, percentage: "5%", fill: Math.round((stateTax / maxTax) * 100) },
    { label: "Self-Employment Tax", amount: seTax, percentage: "15.3%", fill: Math.round((seTax / maxTax) * 100) },
  ];

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
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Net Income (Completed)</Muted>
            <TrendingUp className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="font-bold tracking-tighter text-zinc-900 truncate max-w-full" style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}>
              {fmt(stats?.netIncome ?? 0)}
            </div>
          )}
          <Muted className="text-[10px] mt-1 truncate max-w-full">Revenue minus expenses</Muted>
        </Surface>

        <Surface className="p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2 gap-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Total Expenses (YTD)</Muted>
            <Receipt className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="font-bold tracking-tighter text-zinc-900 truncate max-w-full" style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}>
              {fmt(stats?.totalExpenses ?? 0)}
            </div>
          )}
          <Muted className="text-[10px] mt-1 truncate max-w-full">
            {stats?.expensesByCategory.reduce((s, c) => s + c.count, 0) ?? 0} transactions
          </Muted>
        </Surface>

        <Surface className="p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2 gap-2">
            <Muted className="text-[10px] uppercase tracking-[0.15em] font-bold truncate">Tax Set Aside</Muted>
            <PiggyBank className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="font-bold tracking-tighter text-zinc-900 truncate max-w-full" style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}>
              {fmt(totalTax)}
            </div>
          )}
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
                    <Muted className="text-[10px] uppercase tracking-widest truncate">
                      {bucket.percentage} of net income
                    </Muted>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 shrink-0" />
                  ) : (
                    <div className="text-lg font-bold text-zinc-900 shrink-0">{fmt(bucket.amount)}</div>
                  )}
                </div>
                <div className="h-[2px] w-full bg-zinc-100">
                  <div className="h-full bg-zinc-900 transition-all" style={{ width: `${bucket.fill}%` }} />
                </div>
              </div>
            ))}
          </Surface>
        </div>

        {/* Quarterly Tax Estimates */}
        <div className="md:col-span-5 space-y-4">
          <H2>Quarterly Estimates</H2>
          <Surface className="divide-y divide-zinc-100">
            {quarterlyDueDates.map((q, i) => (
              <div key={i} className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 tracking-tight truncate">{q.quarter}</div>
                  <Muted className="text-xs truncate">Due {q.due}</Muted>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <div className="font-medium text-zinc-900">{fmt(quarterlyTax)}</div>
                  )}
                  {i === 0 && (
                    <span className="border border-zinc-200 text-zinc-900 font-bold text-[10px] px-2 py-0.5 rounded">
                      Next
                    </span>
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
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="p-5 flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : (stats?.expensesByCategory ?? []).length === 0 ? (
              <div className="p-6 text-center">
                <Muted className="text-sm">No expenses logged yet.</Muted>
              </div>
            ) : (
              (stats?.expensesByCategory ?? []).map((cat, i) => (
                <div key={i} className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 tracking-tight text-sm truncate">
                      {formatCategory(cat.category)}
                    </div>
                    <Muted className="text-[10px] uppercase tracking-widest truncate">
                      {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                    </Muted>
                  </div>
                  <div className="font-medium text-zinc-900 shrink-0">{fmt(cat.total)}</div>
                </div>
              ))
            )}
          </Surface>
        </div>

        {/* Effective Hourly Rate by Project */}
        <div className="md:col-span-6 space-y-4">
          <H2>Hourly Rate by Contract</H2>
          <Surface className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Contract</th>
                    <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Rate</th>
                    <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td className="px-5 py-3"><Skeleton className="h-4 w-36" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : (stats?.contractRates ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-zinc-400 text-sm">
                        No time entries logged yet.
                      </td>
                    </tr>
                  ) : (
                    (stats?.contractRates ?? []).map((pr) => (
                      <tr key={pr.id}>
                        <td className="px-5 py-3 max-w-[150px] sm:max-w-xs w-full">
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 text-sm truncate">{pr.title}</div>
                            <Muted className="text-[10px] truncate">
                              {Math.round(pr.totalMinutes / 60)}h logged
                            </Muted>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-bold text-zinc-900 text-sm">
                          {fmtRate(pr.totalMinutes, pr.totalEarned)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-zinc-600">
                          {fmt(pr.total_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
