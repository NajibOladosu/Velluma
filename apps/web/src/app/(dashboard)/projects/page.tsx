"use client"

import * as React from "react"
import { KanbanBoard, KanbanColumn, KanbanCard } from "@/components/ui/kanban"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { H1, Muted, P } from "@/components/ui/typography"
import { Badge } from "@/components/ui/badge"
import { LayoutGrid, List, Plus, Filter, MoreHorizontal } from "lucide-react"

const projectsData = [
    { id: "1", name: "Brand Visuals", client: "Solaris Tech", status: "In Progress", budget: "$12,000", progress: 65 },
    { id: "2", name: "Next.js Architecture", client: "Acme Corp", status: "In Progress", budget: "$8,500", progress: 40 },
    { id: "3", name: "Payment Integration", client: "Stripe Labs", status: "Backlog", budget: "$4,000", progress: 0 },
    { id: "4", name: "CRM Migration", client: "Velluma", status: "Review", budget: "$20,000", progress: 95 },
]

const columns = [
    { accessorKey: "name", header: "Project Name" },
    { accessorKey: "client", header: "Client" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: any) => {
            const status = row.getValue("status")
            return (
                <Badge variant={status === "In Progress" ? "blue" : "default"}>
                    {status}
                </Badge>
            )
        }
    },
    { accessorKey: "budget", header: "Budget" },
    {
        accessorKey: "progress",
        header: "Progress",
        cell: ({ row }: any) => (
            <div className="flex items-center gap-2">
                <div className="w-24 h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                        className="bg-zinc-900 h-full transition-all duration-500"
                        style={{ width: `${row.original.progress}%` }}
                    />
                </div>
                <span className="text-[10px] font-medium text-zinc-500">{row.original.progress}%</span>
            </div>
        )
    },
]

export default function ProjectsPage() {
    const [view, setView] = React.useState<"kanban" | "list">("kanban")

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <H1>Project Control</H1>
                    <Muted>Manage your active workflows and milestone progress.</Muted>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex border border-zinc-200 rounded-md p-1 bg-white">
                        <Button
                            variant={view === "kanban" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setView("kanban")}
                            className="h-7 px-2"
                        >
                            <LayoutGrid className="h-4 w-4 mr-1.5" />
                            Kanban
                        </Button>
                        <Button
                            variant={view === "list" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setView("list")}
                            className="h-7 px-2"
                        >
                            <List className="h-4 w-4 mr-1.5" />
                            List
                        </Button>
                    </div>
                    <Button variant="blue" size="sm">
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Project
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            {view === "kanban" ? (
                <KanbanBoard>
                    <KanbanColumn title="Backlog" count={1}>
                        <KanbanCard id="3">
                            <P className="font-medium text-sm">Payment Integration</P>
                            <Muted className="text-[10px]">Stripe Labs</Muted>
                        </KanbanCard>
                    </KanbanColumn>
                    <KanbanColumn title="In Progress" count={2}>
                        <KanbanCard id="1">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <P className="font-medium text-sm">Brand Visuals</P>
                                        <Muted className="text-[10px]">Solaris Tech</Muted>
                                    </div>
                                    <Badge variant="blue">Active</Badge>
                                </div>
                                <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
                                    <div className="bg-zinc-900 h-full w-[65%]" />
                                </div>
                            </div>
                        </KanbanCard>
                        <KanbanCard id="2">
                            <P className="font-medium text-sm">Next.js Architecture</P>
                            <Muted className="text-[10px]">Acme Corp</Muted>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    <div className="h-5 w-5 rounded-full border border-white bg-zinc-200" />
                                    <div className="h-5 w-5 rounded-full border border-white bg-zinc-300" />
                                </div>
                                <Clock className="h-3 w-3 text-zinc-400" />
                            </div>
                        </KanbanCard>
                    </KanbanColumn>
                    <KanbanColumn title="Review" count={1}>
                        <KanbanCard id="4">
                            <P className="font-medium text-sm">CRM Migration</P>
                            <Muted className="text-[10px]">Velluma</Muted>
                            <div className="mt-3 flex gap-1">
                                <Badge variant="emerald">Hashed</Badge>
                            </div>
                        </KanbanCard>
                    </KanbanColumn>
                    <KanbanColumn title="Completed" count={0} />
                </KanbanBoard>
            ) : (
                <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                    <DataTable columns={columns} data={projectsData} />
                </div>
            )}
        </div>
    )
}

function Clock(props: React.SVGProps<SVGSVGElement>) {
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
