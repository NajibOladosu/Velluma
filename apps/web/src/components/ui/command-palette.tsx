"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Command, X } from "lucide-react"
import { useAppStore } from "@/store/use-app-store"
import { useRouter } from "next/navigation"

export function CommandPalette() {
    const { commandPaletteOpen, setCommandPaletteOpen, toggleCommandPalette } = useAppStore()
    const [query, setQuery] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)
    const router = useRouter()

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

    React.useEffect(() => {
        if (commandPaletteOpen) {
            inputRef.current?.focus()
        }
    }, [commandPaletteOpen])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // Simple mock search functionality
        if (query.toLowerCase().includes("proj")) router.push("/projects")
        if (query.toLowerCase().includes("inv")) router.push("/invoices")
        if (query.toLowerCase().includes("fin")) router.push("/finance")
        setCommandPaletteOpen(false)
        setQuery("")
    }

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
                        <form onSubmit={handleSearch} className="flex items-center px-4 h-14 border-b border-zinc-100">
                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search commands, projects, clients..."
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
                        </form>

                        <div className="p-2 max-h-[300px] overflow-y-auto">
                            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                Suggestions
                            </div>
                            <div className="mt-1 space-y-0.5">
                                {[
                                    { name: "View Projects", icon: Command, shortcut: "G P" },
                                    { name: "Create Invoice", icon: Command, shortcut: "N I" },
                                    { name: "Global Analytics", icon: Command, shortcut: "G A" },
                                ].map((item) => (
                                    <button
                                        key={item.name}
                                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4 text-zinc-400" />
                                            {item.name}
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-400">{item.shortcut}</span>
                                    </button>
                                ))}
                            </div>
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
                                Velluma Command Matrix v1.0
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
