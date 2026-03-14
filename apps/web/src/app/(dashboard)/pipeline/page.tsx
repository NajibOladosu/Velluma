"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Users,
    FileText,
    MessageSquare,
    TrendingUp,
    ArrowUpRight,
    MoreHorizontal,
    Search,
    Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";

const funnelData = [
    { label: "New Inquiries", value: "12", trend: "+2 this week" },
    { label: "Proposals Out", value: "5", trend: "-1 this week" },
    { label: "Negotiating", value: "3", trend: "Steady" },
    { label: "Closed (MTD)", value: "4", trend: "+100% vs last month" },
];

const leads = [
    { client: "Acme Corp", project: "E-commerce Redesign", value: "$12,000", status: "Negotiating", date: "2d ago" },
    { client: "Starlight Digital", project: "Brand Identity Guide", value: "$4,500", status: "Proposal", date: "4d ago" },
    { client: "Nexus Labs", project: "SaaS Dashboard Audit", value: "$8,200", status: "Inquiry", date: "1w ago" },
    { client: "Vesper AI", project: "Marketing Landing Page", value: "$3,100", status: "Inquiry", date: "1w ago" },
];

export default function PipelinePage() {
    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <H1>Pipeline</H1>
                    <Muted>Manage deals and deal flow with absolute clarity.</Muted>
                </div>
                <Button className="font-semibold px-6">
                    Add New Lead
                </Button>
            </div>

            {/* Funnel Overview (Stark Row) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {funnelData.map((item, i) => (
                    <Surface key={i} className="p-6">
                        <div className="flex flex-col space-y-2">
                            <Muted className="text-[10px] uppercase tracking-[0.2em] font-bold">{item.label}</Muted>
                            <div className="text-3xl font-bold tracking-tighter text-zinc-900">{item.value}</div>
                            <div className="text-[10px] font-medium text-zinc-500">{item.trend}</div>
                        </div>
                    </Surface>
                ))}
            </div>

            {/* Leads Table Management */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <H2>Active Leads</H2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Search leads..."
                                className="pl-9 h-9 w-64 bg-white border-zinc-200 text-sm focus:ring-0"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-9 border-zinc-200">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                        </Button>
                    </div>
                </div>

                <Surface className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Client / Project</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Potential Value</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Stage</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Last Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {leads.map((lead, i) => (
                                    <tr key={i} className="group hover:bg-zinc-50/50 transition-colors cursor-pointer">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-zinc-900 tracking-tight">{lead.client}</div>
                                            <div className="text-xs text-zinc-500">{lead.project}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-zinc-900">{lead.value}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium">
                                                {lead.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-xs text-zinc-400">{lead.date}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Surface>
            </div>

            {/* Visual Margin Placeholder */}
            <div className="pt-10">
                <Surface className="p-8 border-dashed border-zinc-200 bg-zinc-50/30 flex flex-col items-center justify-center text-center">
                    <TrendingUp className="h-8 w-8 text-zinc-300 mb-3" strokeWidth={1.5} />
                    <div className="text-sm font-semibold text-zinc-900">Pipeline Intelligence</div>
                    <P className="text-xs text-zinc-500 mt-1 max-w-sm">
                        As your deal flow increases, Velluma will automatically prioritize leads based on your past project success and profitability metrics.
                    </P>
                </Surface>
            </div>
        </div>
    );
}
