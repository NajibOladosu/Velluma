"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Surface } from "./surface"

interface KanbanColumnProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    count?: number
}

export function KanbanColumn({
    title,
    count,
    className,
    children,
    ...props
}: KanbanColumnProps) {
    return (
        <div
            className={cn("flex flex-col gap-4 min-w-[300px] flex-1", className)}
            {...props}
        >
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {title} {count !== undefined && <span className="ml-1 opacity-50">{count}</span>}
                </h3>
            </div>
            <div className="flex flex-col gap-3 min-h-[500px]">
                {children}
            </div>
        </div>
    )
}

interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string
}

export function KanbanCard({
    id,
    className,
    children,
    ...props
}: KanbanCardProps) {
    return (
        <motion.div
            layoutId={id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
        >
            <Surface
                className={cn(
                    "p-4 cursor-grab active:cursor-grabbing hover:border-zinc-300 transition-colors bg-white",
                    className
                )}
                {...props}
            >
                {children}
            </Surface>
        </motion.div>
    )
}

export function KanbanBoard({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex gap-8 overflow-x-auto pb-6 scrollbar-hide",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
