"use client"

import * as React from "react"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H2, H3, P, Muted } from "@/components/ui/typography"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
    ShieldCheck,
    ArrowUpRight,
    Clock,
    Lock,
    ExternalLink,
    ChevronRight,
    TrendingUp,
    CreditCard
} from "lucide-react"

export default function FinancePage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <div className="min-w-0">
                    <H1 className="truncate">Escrow & Finance</H1>
                    <Muted className="break-words">Your cryptographic vault for secured project funds and payouts.</Muted>
                </div>
                <Button variant="outline" className="h-9">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Stripe Dashboard
                </Button>
            </div>

            {/* Onboarding Banner (Stripe Connect) */}
            <Surface className="bg-zinc-900 border-zinc-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 group overflow-hidden relative">
                <div className="flex items-start sm:items-center gap-4 relative z-10 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                        <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                    </div>
                    <div className="space-y-1 min-w-0">
                        <P className="text-white font-medium truncate">Verify your business for Escrow payouts</P>
                        <Muted className="text-zinc-400 break-words line-clamp-2 text-xs sm:text-sm">Complete your Stripe Connect onboarding to start receiving secured milestone payments.</Muted>
                    </div>
                </div>
                <Button className="bg-white text-zinc-900 hover:bg-zinc-100 relative z-10 shrink-0 w-full sm:w-auto">
                    Complete Onboarding
                </Button>
                <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
            </Surface>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Metrics */}
                <Surface className="p-6 space-y-2 flex flex-col justify-center">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Total in Escrow</Muted>
                    <div className="flex items-end gap-2 pr-2">
                        <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] truncate leading-none">$18,450.00</H2>
                        <Badge variant="blue" className="mb-0.5 shrink-0">+12%</Badge>
                    </div>
                    <P className="text-xs text-zinc-500 break-words line-clamp-2">Secured funds waiting for milestone approval.</P>
                </Surface>

                <Surface className="p-6 space-y-2 flex flex-col justify-center">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Available Payout</Muted>
                    <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] truncate leading-none">$3,200.00</H2>
                    <P className="text-xs text-zinc-500 break-words line-clamp-2">Cleared funds ready for instant transfer.</P>
                </Surface>

                <Surface className="p-6 space-y-2 flex flex-col justify-center">
                    <Muted className="text-[10px] uppercase tracking-widest font-bold truncate">Projected Monthly</Muted>
                    <H2 className="text-[clamp(1.5rem,2.5vw,1.875rem)] truncate leading-none">$24,000.00</H2>
                    <P className="text-xs text-zinc-500 break-words line-clamp-2">Based on currently signed smart proposals.</P>
                </Surface>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Escrow Milestones */}
                <div className="lg:col-span-2 space-y-4">
                    <H3 className="text-lg font-semibold">Active Vault Positions</H3>
                    <div className="space-y-3">
                        {[
                            { project: "Website Overhaul", client: "Acme Corp", amount: "$5,500", milestone: "Phase 2: Backend Dev", status: "Secured" },
                            { project: "Mobile App Design", client: "Solaris Tech", amount: "$12,000", milestone: "Deposit: Design System", status: "Released" },
                            { project: "CRM Migration", client: "Velluma", amount: "$950", milestone: "Final Audit", status: "Secured" },
                        ].map((pos, i) => (
                            <Surface key={i} className="p-4 sm:p-5 flex items-center justify-between hover:border-zinc-300 transition-colors">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center">
                                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400" />
                                    </div>
                                    <div className="min-w-0 pr-2">
                                        <P className="text-sm font-medium truncate">{pos.project}</P>
                                        <Muted className="text-xs truncate">{pos.client} <span className="hidden sm:inline">— {pos.milestone}</span></Muted>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                                    <div className="flex flex-col items-end text-right min-w-0">
                                        <P className="text-sm font-semibold truncate">{pos.amount}</P>
                                        <Badge variant={pos.status === "Released" ? "emerald" : "blue"} className="text-[10px] py-0 px-1.5 h-4 shrink-0 mt-0.5 sm:mt-0">
                                            {pos.status}
                                        </Badge>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-zinc-300 hidden sm:block shrink-0" />
                                </div>
                            </Surface>
                        ))}
                    </div>
                </div>

                {/* Financial Health Sidebar */}
                <div className="space-y-6">
                    <Surface className="p-6 space-y-6">
                        <H3 className="text-sm uppercase tracking-wider font-semibold">Financial Velocity</H3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                    <TrendingUp className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <P className="text-sm font-medium truncate">Payout Efficiency</P>
                                    <Muted className="text-xs truncate">Average 2.4 days to release</Muted>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <P className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Next Payout</P>
                                <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-md border border-zinc-200 gap-2 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                        <span className="text-sm font-medium truncate">$3,200.00</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-500 shrink-0">MAR 15</span>
                                </div>
                            </div>
                        </div>
                    </Surface>

                    <Surface className="p-6 space-y-4 border-dashed flex flex-col min-w-0">
                        <CreditCard className="h-5 w-5 text-zinc-400 shrink-0" />
                        <div className="space-y-1 min-w-0">
                            <P className="text-sm font-medium truncate">Auto-Savings (Velluma Tax)</P>
                            <Muted className="text-xs break-words line-clamp-2">20% of every payout is automatically stashed for taxes.</Muted>
                        </div>
                        <Button variant="outline" className="w-full h-8 text-xs shrink-0 mt-auto">Configure Rules</Button>
                    </Surface>
                </div>
            </div>
        </div>
    )
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    )
}
