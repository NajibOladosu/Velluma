"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Upload, Plus, FileText, Download, Trash2, Search } from "lucide-react"

const expensesData = [
    { id: "1", vendor: "Adobe Creative Cloud", date: "Mar 10, 2026", amount: "$54.99", category: "Software", status: "Reimbursable" },
    { id: "2", vendor: "AWS", date: "Mar 08, 2026", amount: "$125.00", category: "Infrastructure", status: "Billed" },
    { id: "3", vendor: "Local Coffee", date: "Mar 05, 2026", amount: "$4.50", category: "Meals", status: "Personal" },
    { id: "4", vendor: "Apple Inc.", date: "Mar 01, 2026", amount: "$2,499.00", category: "Hardware", status: "Billed" },
]

const columns = [
    { accessorKey: "vendor", header: "Vendor / Description" },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "category", header: "Category" },
    {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }: any) => <span className="font-semibold">{row.getValue("amount")}</span>
    },
    {
        accessorKey: "status",
        header: "Tax Status",
        cell: ({ row }: any) => {
            const status = row.getValue("status")
            return (
                <Badge variant={status === "Billed" ? "blue" : "default"}>
                    {status}
                </Badge>
            )
        }
    },
    {
        id: "actions",
        cell: () => (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        )
    }
]

export default function ExpensesPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <div className="min-w-0">
                    <H1 className="truncate">Expense Hub</H1>
                    <Muted className="truncate">Track your overhead and prepare for tax season with clinical precision.</Muted>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Button variant="outline" className="flex-1 sm:flex-none shrink-0">
                        <Download className="h-4 w-4 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">Export CSV</span>
                        <span className="sm:hidden">Export</span>
                    </Button>
                    <Button variant="blue" className="flex-1 sm:flex-none shrink-0">
                        <Plus className="h-4 w-4 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">Add Expense</span>
                        <span className="sm:hidden">Add</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Table */}
                <div className="lg:col-span-3 space-y-4">
                    <Surface className="p-0 overflow-hidden">
                        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-50/30 gap-4 sm:gap-0">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                                <Input placeholder="Filter expenses..." className="pl-9 h-9 w-full" />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                <Button variant="outline" size="sm" className="h-8 flex-1 sm:flex-none">Date Range</Button>
                                <Button variant="outline" size="sm" className="h-8 flex-1 sm:flex-none">Category</Button>
                            </div>
                        </div>
                        <DataTable columns={columns} data={expensesData} />
                    </Surface>
                </div>

                {/* Upload & Summary Sidebar */}
                <div className="space-y-6">
                    <Surface className="p-6 space-y-4 border-dashed border-2 flex flex-col items-center justify-center min-h-[200px] text-center bg-zinc-50/50 hover:bg-zinc-50 transition-colors cursor-pointer group">
                        <div className="h-10 w-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center group-hover:border-zinc-300 transition-colors">
                            <Upload className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                            <P className="text-sm font-medium">Drop receipts here</P>
                            <Muted className="text-[10px] uppercase tracking-wider">PDF, PNG, JPG (Max 10MB)</Muted>
                        </div>
                    </Surface>

                    <Surface className="p-6 space-y-4">
                        <H3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Quick Summary</H3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-zinc-600 truncate">Total Billed</span>
                                <span className="text-sm font-semibold text-zinc-900 shrink-0">$2,624.00</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-zinc-600 truncate">Pending Reimbursements</span>
                                <span className="text-sm font-semibold text-zinc-900 shrink-0">$54.99</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-zinc-600 truncate">Estimated Tax Write-off</span>
                                <span className="text-sm font-semibold text-blue-600 shrink-0">$787.20</span>
                            </div>
                        </div>
                    </Surface>
                </div>
            </div>
        </div>
    )
}

function MoreHorizontal(props: React.SVGProps<SVGSVGElement>) {
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
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
        </svg>
    )
}
