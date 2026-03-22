"use client"

import * as React from "react"
import { Surface } from "@/components/ui/surface"
import { H1, H2, H3, P, Muted } from "@/components/ui/typography"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
    BarChart3,
    Target,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Briefcase
} from "lucide-react"

export default function AnalyticsPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <H1 className="truncate">Profitability Terminal</H1>
                    <Muted className="truncate">Real-time margin analysis and project velocity metrics.</Muted>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Core KPIs */}
                <Surface className="p-6 flex flex-col min-w-0 space-y-2">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Gross Margin</Muted>
                    <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter truncate max-w-full">78%</H2>
                    <div className="flex items-center gap-1 text-emerald-600 min-w-0">
                        <ArrowUpRight className="h-3 w-3 shrink-0" />
                        <span className="text-xs font-medium truncate">+4% vs last month</span>
                    </div>
                </Surface>

                <Surface className="p-6 flex flex-col min-w-0 space-y-2">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Billance Velocity</Muted>
                    <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter truncate max-w-full">4.2</H2>
                    <P className="text-xs text-zinc-500 truncate max-w-full">Days from invoice to payout.</P>
                </Surface>

                <Surface className="p-6 flex flex-col min-w-0 space-y-2">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Burn Rate</Muted>
                    <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] font-bold tracking-tighter truncate max-w-full">$1,850</H2>
                    <div className="flex items-center gap-1 text-zinc-500 min-w-0">
                        <span className="text-xs font-medium truncate">Monthly overhead</span>
                    </div>
                </Surface>

                <Surface className="p-6 flex flex-col min-w-0 space-y-2 bg-zinc-900 border-zinc-800">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 truncate">Projected Q2</Muted>
                    <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] text-white font-bold tracking-tighter truncate max-w-full">$74,500</H2>
                    <P className="text-xs text-zinc-500 italic truncate max-w-full">Based on active escrow.</P>
                </Surface>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Project Profitability Matrix */}
                <div className="lg:col-span-2 space-y-4">
                    <H3 className="text-lg font-semibold">Project Performance Matrix</H3>
                    <Surface className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-50 border-b border-zinc-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Project</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Revenue</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Margin</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">ROI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    {[
                                        { name: "Solaris Mobile App", revenue: "$12,000", margin: "82%", roi: "5.4x" },
                                        { name: "Acme Web Portal", revenue: "$8,500", margin: "64%", roi: "2.8x" },
                                        { name: "Velluma Integration", revenue: "$4,000", margin: "91%", roi: "11.2x" },
                                    ].map((row, i) => (
                                        <tr key={i} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-4 py-4 font-medium text-zinc-900 max-w-[200px] truncate">{row.name}</td>
                                            <td className="px-4 py-4 text-right text-zinc-600">{row.revenue}</td>
                                            <td className="px-4 py-4 text-right">
                                                <Badge variant="default" className="bg-zinc-100 text-zinc-900 border-zinc-200">{row.margin}</Badge>
                                            </td>
                                            <td className="px-4 py-4 text-right font-semibold text-zinc-900">{row.roi}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Surface>
                </div>

                {/* Efficiency Insights Sidebar */}
                <div className="space-y-6">
                    <Surface className="p-6 space-y-6">
                        <div className="flex items-center gap-2 min-w-0">
                            <Zap className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <H3 className="text-sm uppercase tracking-wider font-semibold truncate">Smart Insights</H3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <P className="text-xs font-bold text-zinc-900 truncate">Overhead Alert</P>
                                <P className="text-xs text-zinc-500 leading-relaxed truncate">Software subscriptions are up 15%. Consider auditing unused Project Management seats.</P>
                            </div>
                            <Separator />
                            <div className="space-y-1">
                                <P className="text-xs font-bold text-zinc-900 truncate">Revenue Opportunity</P>
                                <P className="text-xs text-zinc-500 leading-relaxed truncate">Solaris Tech has consistent monthly overages. Propose a retainer to increase margin by 12%.</P>
                            </div>
                        </div>
                    </Surface>

                    <Surface className="bg-blue-600 border-none p-6 space-y-2 text-white shadow-lg shadow-blue-500/10">
                        <Target className="h-5 w-5 mb-2" />
                        <P className="font-semibold text-sm truncate">Goal: $100k Rev</P>
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="bg-white h-full w-[74%]" />
                        </div>
                        <Muted className="text-blue-100 text-[10px] block pt-2 truncate">74% of your annual revenue target reached.</Muted>
                    </Surface>
                </div>
            </div>
        </div>
    )
}
