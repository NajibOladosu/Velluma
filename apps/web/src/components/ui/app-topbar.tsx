"use client"

import * as React from "react"
import { Bell, Search, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Input } from "./input"

export function AppTopBar() {
    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white px-6">
            <div className="flex flex-1 items-center gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                        type="search"
                        placeholder="Search command center..."
                        className="pl-9 bg-zinc-50 border-transparent focus:bg-white transition-all h-9"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900">
                    <Bell className="h-5 w-5" strokeWidth={1.5} />
                </Button>
                <div className="h-8 w-8 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-900 cursor-pointer overflow-hidden transition-colors">
                    <User className="h-5 w-5" strokeWidth={1.5} />
                </div>
            </div>
        </header>
    )
}
