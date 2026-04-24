"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/use-app-store"
import {
    LayoutDashboard,
    Users,
    FileText,
    Clock,
    Wallet,
    Settings,
    ChevronLeft,
    ChevronRight,
    Zap,
    Briefcase,
    PieChart,
    ShieldCheck,
    TrendingUp,
    ReceiptText,
    BarChart3,
    DollarSign,
    Tag,
    CalendarClock,
    Inbox,
    Sparkles,
    ShieldAlert,
    UserPlus,
    Files,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

const navItems = [
    {
        group: "Core", items: [
            { name: "Home",      href: "/dashboard", icon: LayoutDashboard },
            { name: "Analytics", href: "/analytics", icon: BarChart3       },
        ]
    },
    {
        group: "Growth", items: [
            { name: "Pipeline",   href: "/pipeline",   icon: TrendingUp    },
            { name: "Clients",    href: "/clients",    icon: Users         },
            { name: "Proposals",  href: "/proposals",  icon: FileText      },
            { name: "Lead Forms", href: "/lead-forms", icon: Sparkles      },
            { name: "Bookings",   href: "/booking-settings", icon: CalendarClock },
        ]
    },
    {
        group: "Vault", items: [
            { name: "Contracts",     href: "/contracts",     icon: ShieldCheck  },
            { name: "Invoices",      href: "/invoices",      icon: Wallet       },
            { name: "Finance",       href: "/finance",       icon: DollarSign   },
            { name: "Expenses",      href: "/expenses",      icon: ReceiptText  },
            { name: "Profitability", href: "/profitability",  icon: PieChart     },
        ]
    },
    {
        group: "Operations", items: [
            { name: "Projects",    href: "/projects",    icon: Briefcase },
            { name: "Services",    href: "/services",    icon: Tag       },
            { name: "Time",        href: "/time",        icon: Clock     },
            { name: "Messages",    href: "/messages",    icon: Inbox     },
            { name: "Automations", href: "/automations", icon: Zap       },
            { name: "Templates",   href: "/templates",   icon: Files     },
        ]
    },
    {
        group: "Workspace", items: [
            { name: "Team",      href: "/team",      icon: UserPlus   },
            { name: "Audit Log", href: "/audit-log", icon: ShieldAlert },
        ]
    },
]

export function AppSidebar() {
    const { sidebarCollapsed, toggleSidebar } = useAppStore()
    const pathname = usePathname()

    return (
        <motion.aside
            animate={{ width: sidebarCollapsed ? 64 : 260 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn(
                "relative hidden md:flex flex-col border-r border-zinc-200 bg-white h-screen select-none",
                "transition-colors duration-200"
            )}
        >
            {/* Brand Header */}
            <div className="flex h-16 items-center px-6">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-5 w-5 bg-zinc-900 flex-shrink-0" />
                    <AnimatePresence>
                        {!sidebarCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.1 }}
                                className="font-bold tracking-tight text-lg text-zinc-900"
                            >
                                Velluma
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
                {navItems.map((group, i) => (
                    <div key={group.group} className={cn("mb-6 px-4", i === 0 && "mt-2")}>
                        <AnimatePresence mode="wait">
                            {!sidebarCollapsed && (
                                <motion.h4
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400"
                                >
                                    {group.group}
                                </motion.h4>
                            )}
                        </AnimatePresence>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <div
                                            className={cn(
                                                "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-zinc-100 text-zinc-900 shadow-none"
                                                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                                            )}
                                        >
                                            <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-900")} strokeWidth={1.5} />
                                            <AnimatePresence>
                                                {!sidebarCollapsed && (
                                                    <motion.span
                                                        initial={{ opacity: 0, x: -5 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -5 }}
                                                        className="ml-3 whitespace-nowrap"
                                                    >
                                                        {item.name}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer / Settings */}
            <div className="border-t border-zinc-200 p-4">
                <Link href="/settings">
                    <div className={cn(
                        "flex items-center rounded-md px-2 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors",
                        pathname === "/settings" && "bg-zinc-100 text-zinc-900"
                    )}>
                        <Settings className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                        {!sidebarCollapsed && <span className="ml-3">Settings</span>}
                    </div>
                </Link>
            </div>

            {/* Collapse Toggle */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="absolute -right-3 top-20 h-6 w-6 rounded-md border border-zinc-200 bg-white p-0 hover:bg-zinc-50 md:flex"
            >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
        </motion.aside>
    )
}
