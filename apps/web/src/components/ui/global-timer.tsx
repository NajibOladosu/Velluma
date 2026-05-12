"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { motion, type PanInfo } from "framer-motion"
import { Play, Square, Timer, ChevronRight, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

// ---------------------------------------------------------------------------
// Persistent position
//
// Stored in sessionStorage (per user request: "persists for each session" =
// stays put while the tab/window is alive, resets when the session ends).
// Switch to localStorage if cross-session persistence is later desired.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "velluma:global-timer:position"
const PILL_WIDTH_FALLBACK = 220
const PILL_HEIGHT_FALLBACK = 48
const EDGE_PADDING = 16

interface Position {
    x: number
    y: number
}

function readStoredPosition(): Position | null {
    if (typeof window === "undefined") return null
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Position
        if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null
        return parsed
    } catch {
        return null
    }
}

function writeStoredPosition(pos: Position) {
    if (typeof window === "undefined") return
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
    } catch {
        // sessionStorage may be disabled (private browsing edge cases) — ignore.
    }
}

/** Default = bottom-right corner with edge padding. */
function defaultPosition(width: number, height: number): Position {
    if (typeof window === "undefined") {
        return { x: 0, y: 0 }
    }
    return {
        x: window.innerWidth - width - EDGE_PADDING,
        y: window.innerHeight - height - EDGE_PADDING,
    }
}

/** Clamp a point to the visible viewport. */
function clampToViewport(pos: Position, width: number, height: number): Position {
    if (typeof window === "undefined") return pos
    const maxX = Math.max(0, window.innerWidth - width)
    const maxY = Math.max(0, window.innerHeight - height)
    return {
        x: Math.min(Math.max(0, pos.x), maxX),
        y: Math.min(Math.max(0, pos.y), maxY),
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalTimer() {
    const pathname = usePathname()
    const [isActive, setIsActive] = React.useState(false)
    const [time, setTime] = React.useState(0)
    const [mounted, setMounted] = React.useState(false)
    const [position, setPosition] = React.useState<Position>({ x: 0, y: 0 })

    // The timer was visible on every dashboard page in an idle 00:00:00 state
    // and read as a debug/leftover overlay. Only render it when:
    //   (a) the user is on the Time tracker page (where the timer is in scope), or
    //   (b) the timer is actively running (so they can stop it from anywhere).
    const onTimePage = pathname?.startsWith("/time")
    const shouldRender = isActive || onTimePage

    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const sizeRef = React.useRef({ w: PILL_WIDTH_FALLBACK, h: PILL_HEIGHT_FALLBACK })

    // Measure the pill once mounted so drag constraints are accurate.
    const measure = React.useCallback(() => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        sizeRef.current = { w: rect.width, h: rect.height }
    }, [])

    // Initialize position on the client (avoid SSR mismatch — `window` is unavailable on server).
    React.useEffect(() => {
        measure()
        const { w, h } = sizeRef.current
        const stored = readStoredPosition()
        const initial = stored ?? defaultPosition(w, h)
        setPosition(clampToViewport(initial, w, h))
        setMounted(true)
    }, [measure])

    // Re-clamp on viewport resize so the pill never lands off-screen.
    React.useEffect(() => {
        if (!mounted) return
        const handler = () => {
            measure()
            const { w, h } = sizeRef.current
            setPosition((prev) => {
                const clamped = clampToViewport(prev, w, h)
                if (clamped.x !== prev.x || clamped.y !== prev.y) {
                    writeStoredPosition(clamped)
                }
                return clamped
            })
        }
        window.addEventListener("resize", handler)
        return () => window.removeEventListener("resize", handler)
    }, [mounted, measure])

    // Tick the timer when active.
    React.useEffect(() => {
        if (!isActive) return
        const interval = setInterval(() => {
            setTime((t) => t + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [isActive])

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }

    function handleDragEnd(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
        const { w, h } = sizeRef.current
        const next = clampToViewport(
            { x: position.x + info.offset.x, y: position.y + info.offset.y },
            w,
            h,
        )
        setPosition(next)
        writeStoredPosition(next)
    }

    // Don't render until we've placed the pill — prevents a single frame in the
    // wrong spot (top-left flash) on first paint.
    if (!mounted) return null
    if (!shouldRender) return null

    return (
        <motion.div
            ref={containerRef}
            drag
            dragMomentum={false}
            dragElastic={0}
            // Using `style` for position so framer-motion's drag transform composes
            // cleanly with our absolute placement. We reset transform after each
            // drag by re-keying via the `position` state and resetting `x`/`y`
            // animate values to 0 (drag deltas are baked into `position`).
            style={{ position: "fixed", left: position.x, top: position.y, zIndex: 50 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.2 } }}
            onDragEnd={handleDragEnd}
            className={cn(
                "flex items-center gap-2 bg-zinc-900 shadow-lg rounded-full pl-2 pr-3 py-2 select-none",
                "cursor-grab active:cursor-grabbing",
                isActive && "ring-2 ring-blue-500 ring-offset-2",
            )}
        >
            {/* Drag handle — explicit visual affordance */}
            <div className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Drag handle">
                <GripVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
            </div>

            <div className="flex items-center gap-2 pr-2 border-r border-zinc-700">
                <Timer className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                <span className="text-sm font-mono text-white tracking-widest tabular-nums">
                    {formatTime(time)}
                </span>
            </div>

            {/* Buttons — wrapped so click events on them don't get captured as drag-start */}
            <div
                className="flex items-center gap-1"
                onPointerDown={(e) => e.stopPropagation()}
            >
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
    )
}
