"use client";

import * as React from "react";
import { Bell, Menu, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { MobileNavDrawer } from "./mobile-nav-drawer";

export function AppTopBar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

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
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="search"
              readOnly
              placeholder="Press ⌘K to search clients, invoices, or projects..."
              className="pl-10 bg-zinc-50 border-zinc-200 focus:bg-white transition-all h-10 w-full cursor-pointer rounded-md text-sm font-normal"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Search icon on mobile — tap to open search */}
          <Button
            variant="ghost"
            size="icon"
            className="flex sm:hidden h-9 w-9 text-zinc-500 hover:text-zinc-900"
            aria-label="Search"
          >
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 h-9 w-9">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
          </Button>
          <div className="h-9 w-9 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-900 cursor-pointer overflow-hidden transition-colors hover:bg-zinc-100">
            <User className="h-5 w-5" strokeWidth={1.5} />
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
