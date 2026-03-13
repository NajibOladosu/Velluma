"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Square, Timer, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export function GlobalTimer() {
    const [isActive, setIsActive] = React.useState(false)
    const [time, setTime] = React.useState(0)

    React.useEffect(() => {
        let interval: any
        if (isActive) {
            interval = setInterval(() => {
                setTime((t) => t + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isActive])

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                    "flex items-center gap-3 bg-zinc-900 shadow-lg rounded-full px-4 py-2 transition-all duration-300",
                    isActive && "ring-2 ring-blue-500 ring-offset-2"
                )}
            >
                <div className="flex items-center gap-2 pr-2 border-r border-zinc-700">
                    <Timer className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-mono text-white tracking-widest tabular-nums">
                        {formatTime(time)}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {!isActive ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsActive(true)}
                            className="h-8 w-8 text-white hover:bg-zinc-800 hover:text-white rounded-full"
                        >
                            <Play className="h-4 w-4 fill-current" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsActive(false)}
                            className="h-8 w-8 text-white hover:bg-zinc-800 hover:text-white rounded-full"
                        >
                            <Square className="h-4 w-4 fill-current" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-zinc-800 hover:text-white rounded-full"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}
