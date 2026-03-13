"use client"

import * as React from "react"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H2, H3, P, Muted } from "@/components/ui/typography"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Send,
    Download,
    DollarSign,
    Calendar,
    User,
    CreditCard,
    Plus,
    Trash2
} from "lucide-react"

export default function InvoiceDraftPage() {
    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <H1>Invoice #INV-2026-001</H1>
                    <Muted>Drafting your next payout. Funds will be routed via Velluma Escrow.</Muted>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                    </Button>
                    <Button variant="blue">
                        <Send className="mr-2 h-4 w-4" />
                        Send Invoice
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invoice Body */}
                <div className="lg:col-span-2 space-y-6">
                    <Surface className="p-10 space-y-12">
                        {/* Invoice Top Section */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-4">
                                <div className="h-10 w-10 rounded bg-zinc-900" />
                                <div className="space-y-1">
                                    <P className="font-semibold">Najib Oladosu</P>
                                    <Muted className="text-xs block">123 Design St, London, UK</Muted>
                                    <Muted className="text-xs block">billing@najib.dev</Muted>
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <H2 className="text-4xl text-zinc-900">INVOICE</H2>
                                <Muted className="text-xs block tracking-widest uppercase">Issued Mar 13, 2026</Muted>
                            </div>
                        </div>

                        <Separator />

                        {/* Bill To / Info Section */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Muted className="text-[10px] uppercase tracking-widest font-bold">Bill To</Muted>
                                <div className="space-y-1">
                                    <P className="font-semibold">Acme Corporation</P>
                                    <Muted className="text-xs block">456 Enterprise Way</Muted>
                                    <Muted className="text-xs block">San Francisco, CA 94105</Muted>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Muted className="text-[10px] uppercase tracking-widest font-bold">Due Date</Muted>
                                    <P className="text-sm font-medium">Mar 27, 2026</P>
                                </div>
                                <div className="space-y-1 text-right">
                                    <Muted className="text-[10px] uppercase tracking-widest font-bold">Payment Method</Muted>
                                    <P className="text-sm font-medium">Velluma Escrow</P>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 px-2">
                                <div className="col-span-6"><Muted className="text-[10px] uppercase tracking-widest font-bold">Description</Muted></div>
                                <div className="col-span-2 text-right"><Muted className="text-[10px] uppercase tracking-widest font-bold">Qty/Hrs</Muted></div>
                                <div className="col-span-2 text-right"><Muted className="text-[10px] uppercase tracking-widest font-bold">Rate</Muted></div>
                                <div className="col-span-2 text-right"><Muted className="text-[10px] uppercase tracking-widest font-bold">Amount</Muted></div>
                            </div>
                            <Separator />
                            <div className="space-y-6">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-6 space-y-1">
                                        <P className="text-sm font-medium">Next.js Dashboard Implementation</P>
                                        <Muted className="text-xs">Phase 1: Component library and basic routing.</Muted>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm">40</span>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm">$150.00</span>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm font-semibold">$6,000.00</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-6 space-y-1">
                                        <P className="text-sm font-medium">Consulting Sessions</P>
                                        <Muted className="text-xs">Architecture review with CTO.</Muted>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm">4</span>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm">$200.00</span>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm font-semibold">$800.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end pt-8">
                            <div className="w-full max-w-[240px] space-y-3">
                                <div className="flex justify-between">
                                    <Muted>Subtotal</Muted>
                                    <span className="text-sm font-medium text-zinc-900">$6,800.00</span>
                                </div>
                                <div className="flex justify-between">
                                    <Muted>Platform Fee (1.5%)</Muted>
                                    <span className="text-sm font-medium text-zinc-400">-$102.00</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center py-2">
                                    <H3 className="text-lg">Total Due</H3>
                                    <span className="text-2xl font-bold text-zinc-900">$6,698.00</span>
                                </div>
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Action Sidebar */}
                <div className="space-y-6">
                    <Surface className="p-6 space-y-4">
                        <H3 className="text-sm uppercase tracking-wider font-semibold">Invoice Status</H3>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <P className="text-sm font-medium">Drafting</P>
                        </div>
                        <Muted className="text-xs block">Last saved 2 minutes ago</Muted>
                        <Separator />
                        <div className="space-y-1">
                            <Muted className="text-[10px] uppercase tracking-widest font-bold">Payment Schedule</Muted>
                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="text-xs">Net 14</span>
                                </div>
                                <span className="text-xs font-semibold text-zinc-900">Edit</span>
                            </div>
                        </div>
                    </Surface>

                    <Surface className="p-6 space-y-4 bg-zinc-50 border-zinc-300">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-zinc-900" />
                            <H3 className="text-sm uppercase tracking-wider font-semibold">Payout Routing</H3>
                        </div>
                        <P className="text-xs text-zinc-600">
                            Funds will be deposited to your **Standard Chartered bank account (****1234)** via Stripe Connect.
                        </P>
                        <Button variant="outline" className="w-full text-xs h-8">Change Account</Button>
                    </Surface>
                </div>
            </div>
        </div>
    )
}
