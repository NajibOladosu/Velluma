"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Search,
    X,
    LayoutDashboard,
    Users,
    FileText,
    Clock,
    Wallet,
    Settings,
    Zap,
    Briefcase,
    PieChart,
    ShieldCheck,
    TrendingUp,
    ReceiptText,
    BarChart3,
    DollarSign,
    User,
} from "lucide-react"
import { useAppStore } from "@/store/use-app-store"
import { useRouter } from "next/navigation"

interface CommandItem {
    name: string
    href: string
    icon: React.ElementType
    group: string
    keywords?: string[]
}

const COMMAND_ITEMS: CommandItem[] = [
    // Core
    { name: "Home",          href: "/dashboard",     icon: LayoutDashboard, group: "Core",       keywords: ["dashboard", "overview", "home"] },
    { name: "Analytics",     href: "/analytics",     icon: BarChart3,       group: "Core",       keywords: ["analytics", "stats", "metrics", "profitability"] },
    // Growth
    { name: "Pipeline",      href: "/pipeline",      icon: TrendingUp,      group: "Growth",     keywords: ["pipeline", "leads", "funnel", "sales"] },
    { name: "Clients",       href: "/clients",       icon: Users,           group: "Growth",     keywords: ["clients", "contacts", "crm", "customers"] },
    { name: "Proposals",     href: "/proposals",     icon: FileText,        group: "Growth",     keywords: ["proposals", "quotes", "estimates"] },
    // Vault
    { name: "Contracts",     href: "/contracts",     icon: ShieldCheck,     group: "Vault",      keywords: ["contracts", "agreements", "legal", "templates"] },
    { name: "Invoices",      href: "/invoices",      icon: Wallet,          group: "Vault",      keywords: ["invoices", "billing", "payments"] },
    { name: "Finance",       href: "/finance",       icon: DollarSign,      group: "Vault",      keywords: ["finance", "money", "revenue", "earnings"] },
    { name: "Expenses",      href: "/expenses",      icon: ReceiptText,     group: "Vault",      keywords: ["expenses", "costs", "receipts", "spending"] },
    { name: "Profitability", href: "/profitability",  icon: PieChart,        group: "Vault",      keywords: ["profitability", "margins", "roi"] },
    // Operations
    { name: "Projects",      href: "/projects",      icon: Briefcase,       group: "Operations", keywords: ["projects", "tasks", "milestones", "kanban"] },
    { name: "Time Tracking", href: "/time",          icon: Clock,           group: "Operations", keywords: ["time", "timer", "hours", "tracking", "timesheet"] },
    { name: "Automations",   href: "/automations",   icon: Zap,             group: "Operations", keywords: ["automations", "workflows", "rules", "triggers"] },
    // Account
    { name: "Profile",       href: "/profile",       icon: User,            group: "Account",    keywords: ["profile", "account", "me", "personal"] },
    { name: "Settings",      href: "/settings",      icon: Settings,        group: "Account",    keywords: ["settings", "preferences", "config", "workspace"] },
]

function filterItems(query: string): CommandItem[] {
    if (!query.trim()) return COMMAND_ITEMS
    const lower = query.toLowerCase()
    return COMMAND_ITEMS.filter((item) => {
        const searchable = [item.name, item.group, ...(item.keywords ?? [])].join(" ").toLowerCase()
        return searchable.includes(lower)
    })
}

export function CommandPalette() {
    const { commandPaletteOpen, setCommandPaletteOpen, toggleCommandPalette } = useAppStore()
    const [query, setQuery] = React.useState("")
    const [selectedIndex, setSelectedIndex] = React.useState(0)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const listRef = React.useRef<HTMLDivElement>(null)
    const router = useRouter()

    const results = React.useMemo(() => filterItems(query), [query])

    // Reset state when opening/closing
    React.useEffect(() => {
        if (commandPaletteOpen) {
            setQuery("")
            setSelectedIndex(0)
            inputRef.current?.focus()
        }
    }, [commandPaletteOpen])

    // Reset selection when results change
    React.useEffect(() => {
        setSelectedIndex(0)
    }, [results.length])

    // Scroll selected item into view
    React.useEffect(() => {
        const container = listRef.current
        if (!container) return
        const selected = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null
        if (selected) {
            selected.scrollIntoView({ block: "nearest" })
        }
    }, [selectedIndex])

    // Keyboard shortcuts
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                toggleCommandPalette()
            }
            if (e.key === "Escape") {
                setCommandPaletteOpen(false)
            }
        }
        window.addEventListener("keydown", down)
        return () => window.removeEventListener("keydown", down)
    }, [toggleCommandPalette, setCommandPaletteOpen])

    function navigate(href: string) {
        router.push(href)
        setCommandPaletteOpen(false)
        setQuery("")
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex((i) => (i + 1) % results.length)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex((i) => (i - 1 + results.length) % results.length)
        } else if (e.key === "Enter" && results.length > 0) {
            e.preventDefault()
            navigate(results[selectedIndex].href)
        }
    }

    // Group results for display
    const grouped = React.useMemo(() => {
        const groups: Record<string, CommandItem[]> = {}
        for (const item of results) {
            if (!groups[item.group]) groups[item.group] = []
            groups[item.group].push(item)
        }
        return groups
    }, [results])

    return (
        <AnimatePresence>
            {commandPaletteOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCommandPaletteOpen(false)}
                        className="fixed inset-0 bg-zinc-900/10 backdrop-blur-[2px]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
                    >
                        <div className="flex items-center px-4 h-14 border-b border-zinc-100">
                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search commands, pages, actions..."
                                className="flex-1 bg-transparent px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
                            />
                            <div className="flex items-center gap-1">
                                <kbd className="hidden sm:flex h-5 items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-1.5 font-mono text-[10px] font-medium text-zinc-500">
                                    <span className="text-xs">⌘</span>K
                                </kbd>
                                <button
                                    type="button"
                                    onClick={() => setCommandPaletteOpen(false)}
                                    className="p-1 hover:bg-zinc-50 rounded-md transition-colors"
                                >
                                    <X className="h-4 w-4 text-zinc-400" />
                                </button>
                            </div>
                        </div>

                        <div ref={listRef} className="p-2 max-h-[300px] overflow-y-auto">
                            {results.length === 0 ? (
                                <div className="px-3 py-8 text-center">
                                    <p className="text-sm text-zinc-400">No results found for &ldquo;{query}&rdquo;</p>
                                </div>
                            ) : (
                                Object.entries(grouped).map(([group, items]) => {
                                    return (
                                        <div key={group}>
                                            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                                {group}
                                            </div>
                                            <div className="mt-0.5 space-y-0.5">
                                                {items.map((item) => {
                                                    const globalIndex = results.indexOf(item)
                                                    const isSelected = globalIndex === selectedIndex
                                                    return (
                                                        <button
                                                            key={item.href}
                                                            data-index={globalIndex}
                                                            onClick={() => navigate(item.href)}
                                                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                                                                isSelected
                                                                    ? "bg-zinc-100 text-zinc-900"
                                                                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <item.icon className="h-4 w-4 text-zinc-400" />
                                                                {item.name}
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-4 py-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <kbd className="rounded border border-zinc-200 bg-white px-1 font-mono text-[10px] text-zinc-500">↵</kbd>
                                    <span className="text-[10px] text-zinc-400">to select</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <kbd className="rounded border border-zinc-200 bg-white px-1 font-mono text-[10px] text-zinc-500">↑↓</kbd>
                                    <span className="text-[10px] text-zinc-400">to navigate</span>
                                </div>
                            </div>
                            <div className="text-[10px] text-zinc-400">
                                {results.length} result{results.length !== 1 ? "s" : ""}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
