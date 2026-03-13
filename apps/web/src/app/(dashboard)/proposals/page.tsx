"use client"

import * as React from "react"
import { MinimalEditor } from "@/components/editor/editor"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H2, H3, P, Muted } from "@/components/ui/typography"
import { PricingTierCard } from "@/components/ui/pricing-tier"
import { SignatureBlock } from "@/components/ui/signature-block"
import { Separator } from "@/components/ui/separator"
import { Save, Send, Eye, FileText, Plus } from "lucide-react"

export default function ProposalBuilderPage() {
    const [selectedTier, setSelectedTier] = React.useState<string | null>(null)

    return (
        <div className="space-y-8 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <H1>New Smart Proposal</H1>
                    <Muted>Assemble your project terms and secure funds in one scroll.</Muted>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                    </Button>
                    <Button variant="outline">
                        <Save className="mr-2 h-4 w-4" />
                        Save Draft
                    </Button>
                    <Button variant="blue">
                        <Send className="mr-2 h-4 w-4" />
                        Send to Client
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Editor Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Surface className="p-8 space-y-6">
                        <div className="space-y-2">
                            <H2 className="text-3xl">Project Scope: Website Overhaul</H2>
                            <Muted className="text-zinc-400">Velluma Inc. & Acme Corp.</Muted>
                        </div>
                        <Separator />
                        <MinimalEditor
                            className="border-none p-0"
                            placeholder="Detail your deliverables, timelines, and legal clauses here..."
                        />
                    </Surface>

                    <Surface className="p-8 space-y-8">
                        <div className="flex flex-col gap-1">
                            <H3>Service Packages</H3>
                            <P className="text-sm text-zinc-500">Clients can select their preferred tier directly from this proposal.</P>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PricingTierCard
                                title="Foundation"
                                price="$2,500"
                                description="Core setup and essential features."
                                features={[
                                    "5 Core Landing Pages",
                                    "Contact Integration",
                                    "Basic SEO setup",
                                    "2 Revision Rounds"
                                ]}
                                isSelected={selectedTier === "foundation"}
                                onSelect={() => setSelectedTier("foundation")}
                            />
                            <PricingTierCard
                                title="Scale"
                                price="$5,500"
                                description="Advanced features for growing teams."
                                features={[
                                    "Everything in Foundation",
                                    "E-commerce setup",
                                    "Analytics Dashboard",
                                    "Priority Support"
                                ]}
                                isSelected={selectedTier === "scale"}
                                onSelect={() => setSelectedTier("scale")}
                            />
                        </div>
                        <Button variant="outline" className="w-full border-dashed">
                            <Plus className="mr-2 h-4 w-4" />
                            Add custom tier
                        </Button>
                    </Surface>

                    <Surface className="p-8 space-y-8">
                        <H3>Legal & Signatures</H3>
                        <P className="text-sm text-zinc-500 italic">This document is cryptographically hashed once signed and stored securely in the Velluma Vault.</P>
                        <div className="flex flex-wrap gap-8 pt-4">
                            <SignatureBlock label="Freelancer Signature" />
                            <SignatureBlock label="Client Signature" className="opacity-50 pointer-events-none" />
                        </div>
                    </Surface>
                </div>

                {/* Sidebar / Settings Section */}
                <div className="space-y-6">
                    <Surface className="p-6 space-y-4">
                        <H3 className="text-sm uppercase tracking-wider font-semibold">Proposal Settings</H3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Project Type</label>
                                <div className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 flex items-center text-sm">
                                    Design & Development
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Escrow Configuration</label>
                                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Deposit Upfront</span>
                                        <span className="text-xs font-semibold">50%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Milestone Releases</span>
                                        <span className="text-xs font-semibold">2 Tranches</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Surface>

                    <Surface className="p-6 space-y-4 bg-zinc-900 text-white">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-zinc-400" />
                            <H3 className="text-sm uppercase tracking-wider font-semibold text-white">Escrow Security</H3>
                        </div>
                        <P className="text-xs text-zinc-400 leading-relaxed">
                            Funds will be held in a secure Stripe Connect vault. Payouts are triggered instantly upon client milestone approval.
                        </P>
                    </Surface>
                </div>
            </div>
        </div>
    )
}

function Wallet(props: React.SVGProps<SVGSVGElement>) {
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
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
    )
}
