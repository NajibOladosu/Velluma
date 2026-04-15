"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { useAppStore } from "@/store/use-app-store";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function AppTopBar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { setCommandPaletteOpen } = useAppStore();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 h-9 w-9 text-zinc-500 hover:text-zinc-900 md:hidden flex-shrink-0"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        {/* Search bar — hidden on mobile, visible sm+ */}
        <div className="hidden sm:flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="relative w-full max-w-xl flex items-center h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 hover:bg-white hover:border-zinc-300 transition-all cursor-pointer"
          >
            <Search className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Search clients, invoices, or projects...</span>
            <kbd className="ml-auto hidden md:flex h-5 items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-400 shrink-0">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Search icon on mobile — tap to open command palette */}
          <Button
            variant="ghost"
            size="icon"
            className="flex sm:hidden h-9 w-9 text-zinc-500 hover:text-zinc-900"
            aria-label="Search"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </Button>
          <NotificationBell />
          <Link href="/profile">
            <div className="h-9 w-9 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-900 cursor-pointer overflow-hidden transition-colors hover:bg-zinc-100">
              <User className="h-5 w-5" strokeWidth={1.5} />
            </div>
          </Link>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
