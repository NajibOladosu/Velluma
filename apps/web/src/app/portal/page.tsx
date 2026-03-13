"use client"

import * as React from "react"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H2, H3, P, Muted } from "@/components/ui/typography"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
    ShieldCheck,
    ExternalLink,
    Lock,
    MessageSquare,
    FileText,
    Clock,
    ArrowUpRight
} from "lucide-react"

export default function ClientPortalPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6 space-y-10">
            {/* Client Identity & Trust Badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-zinc-900 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <H1 className="text-2xl">Client Success Portal</H1>
                        <Muted>Secured environment for Acme Corp & Najib Oladosu.</Muted>
                    </div>
                </div>
                <Badge variant="blue" className="px-3 py-1">Active Partnership</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Surface className="p-6 space-y-2">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold">Vault Security</Muted>
                    <H2 className="text-2xl font-bold">$5,500</H2>
                    <P className="text-[10px] text-zinc-500">Currently held in Escrow</P>
                </Surface>
                <Surface className="p-6 space-y-2">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold">Project Progress</Muted>
                    <H2 className="text-2xl font-bold">64%</H2>
                    <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mt-2">
                        <div className="bg-zinc-900 h-full w-[64%]" />
                    </div>
                </Surface>
                <Surface className="p-6 space-y-2">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold">Next Milestone</Muted>
                    <H2 className="text-sm font-bold">Backend Integration</H2>
                    <P className="text-[10px] text-zinc-500">ETA: Mar 18, 2026</P>
                </Surface>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Core Actions */}
                <div className="space-y-6">
                    <H3 className="text-lg font-semibold">Active Workstreams</H3>
                    <div className="space-y-3">
                        {[
                            { title: "Review UI Prototypes", type: "Approval", icon: FileText },
                            { title: "Message Workspace", type: "Chat", icon: MessageSquare },
                            { title: "Shared Vault Files", type: "Assets", icon: Lock },
                        ].map((action, i) => (
                            <Surface key={i} className="p-4 flex items-center justify-between group cursor-pointer hover:border-zinc-300 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors">
                                        <action.icon className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                                    </div>
                                    <div>
                                        <P className="text-sm font-medium">{action.title}</P>
                                        <Muted className="text-[10px] uppercase tracking-widest">{action.type}</Muted>
                                    </div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-900 transition-all" />
                            </Surface>
                        ))}
                    </div>
                </div>

                {/* Payment History & Escrow */}
                <div className="space-y-6">
                    <H3 className="text-lg font-semibold">Escrow Ledger</H3>
                    <Surface className="p-0 overflow-hidden">
                        <div className="p-4 bg-zinc-50/50 border-b border-zinc-200">
                            <P className="text-xs font-medium">Recent Transactions</P>
                        </div>
                        <div className="divide-y divide-zinc-200">
                            {[
                                { label: "Deposit: Design Phase", amount: "$2,500", date: "Mar 01", status: "Released" },
                                { label: "Milestone: Backend Arch", amount: "$3,000", date: "Mar 10", status: "Secured" },
                            ].map((ledger, i) => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div>
                                        <P className="text-sm font-medium">{ledger.label}</P>
                                        <Muted className="text-xs">{ledger.date}</Muted>
                                    </div>
                                    <div className="text-right">
                                        <P className="text-sm font-semibold">{ledger.amount}</P>
                                        <Badge variant={ledger.status === "Released" ? "emerald" : "blue"} className="h-4 text-[9px] px-1.5">{ledger.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Surface>
                </div>
            </div>

            {/* Trust Footer */}
            <div className="text-center pt-10">
                <Muted className="text-[10px] uppercase tracking-widest leading-loose">
                    All transactions are secured by 256-bit encryption. <br />
                    Velluma Dispute Resolution is active for this project.
                </Muted>
            </div>
        </div>
    )
}
