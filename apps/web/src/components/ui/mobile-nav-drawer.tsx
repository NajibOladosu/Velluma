"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Wallet,
  Settings,
  X,
  Zap,
  Briefcase,
  PieChart,
  ShieldCheck,
  TrendingUp,
  ReceiptText,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    group: "Core",
    items: [
      { name: "Home",      href: "/dashboard", icon: LayoutDashboard },
      { name: "Analytics", href: "/analytics", icon: BarChart3       },
    ],
  },
  {
    group: "Growth",
    items: [
      { name: "Pipeline",  href: "/pipeline",  icon: TrendingUp },
      { name: "Clients",   href: "/clients",   icon: Users      },
      { name: "Proposals", href: "/proposals", icon: FileText   },
    ],
  },
  {
    group: "Vault",
    items: [
      { name: "Contracts",     href: "/contracts",     icon: ShieldCheck },
      { name: "Invoices",      href: "/invoices",      icon: Wallet      },
      { name: "Finance",       href: "/finance",       icon: DollarSign  },
      { name: "Expenses",      href: "/expenses",      icon: ReceiptText },
      { name: "Profitability", href: "/profitability", icon: PieChart    },
    ],
  },
  {
    group: "Operations",
    items: [
      { name: "Projects",    href: "/projects",    icon: Briefcase },
      { name: "Time",        href: "/time",        icon: Clock     },
      { name: "Automations", href: "/automations", icon: Zap       },
    ],
  },
];

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();

  // Close on route change
  React.useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white md:hidden"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-5 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-zinc-900 flex-shrink-0" />
                <span className="font-bold tracking-tight text-lg text-zinc-900">
                  Velluma
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav groups */}
            <div className="flex-1 overflow-y-auto py-4 px-4">
              {navItems.map((group) => (
                <div key={group.group} className="mb-6">
                  <h4 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                    {group.group}
                  </h4>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-zinc-100 text-zinc-900"
                                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isActive ? "text-zinc-900" : "text-zinc-400"
                              )}
                              strokeWidth={1.5}
                            />
                            {item.name}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 p-4">
              <Link href="/settings">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors",
                    pathname === "/settings" && "bg-zinc-100 text-zinc-900"
                  )}
                >
                  <Settings className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                  Settings
                </div>
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
