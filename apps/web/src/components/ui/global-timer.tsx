"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Play, Square, Timer, GripVertical, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import {
    useStartTimer,
    useStopTimer,
    useTimeEntries,
} from "@/lib/queries/time"
import { useProjects } from "@/lib/queries/projects"

// ---------------------------------------------------------------------------
// Persistent position (sessionStorage — resets at tab close)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "velluma:global-timer:position"
const PILL_WIDTH_FALLBACK = 240
const PILL_HEIGHT_FALLBACK = 48
const EDGE_PADDING = 16

interface Position {
    x: number
    y: number
}

function readStoredPosition(): Position | null {
    if (typeof window === "undefined") return null
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
    } catch {
        /* localStorage disabled — ignore */
    }
}

function defaultPosition(width: number, height: number): Position {
    if (typeof window === "undefined") return { x: 0, y: 0 }
    return {
        x: window.innerWidth - width - EDGE_PADDING,
        y: window.innerHeight - height - EDGE_PADDING,
    }
}

function clampToViewport(pos: Position, width: number, height: number): Position {
    if (typeof window === "undefined") return pos
    const maxX = Math.max(0, window.innerWidth - width)
    const maxY = Math.max(0, window.innerHeight - height)
    return {
        x: Math.min(Math.max(0, pos.x), maxX),
        y: Math.min(Math.max(0, pos.y), maxY),
    }
}

function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalTimer() {
    const pathname = usePathname()

    // The floating timer is freelancer-side only.
    //   - Hidden on /portal/*  : it's a client surface; freelancer's timer is irrelevant
    //   - Hidden on /pt/*      : public contract-link landing route
    //   - Hidden on /book/*    : public booking page
    //   - Hidden on /f/*       : public lead-form page
    // Only renders on the dashboard when running OR when the user is on /time.
    const isPublicSurface =
        pathname?.startsWith("/portal") ||
        pathname?.startsWith("/pt/") ||
        pathname?.startsWith("/book/") ||
        pathname?.startsWith("/f/") ||
        pathname?.startsWith("/login") ||
        pathname?.startsWith("/signup")

    void pathname // (was used for /time gate; pill now renders on every dashboard page)

    // Server-side mutations
    const startTimer = useStartTimer()
    const stopTimer = useStopTimer()
    const { data: entries = [] } = useTimeEntries()
    const { data: projects = [] } = useProjects()

    // Source of truth for "running" is a DB row: a time_entry with end_time null.
    // Avoids drift between this widget and the /time page (which used to tick
    // independently).
    const liveEntry = React.useMemo(
        () => entries.find((e) => e.endTime === null),
        [entries],
    )
    const isActive = Boolean(liveEntry)

    // Live elapsed seconds for the running entry
    const [elapsed, setElapsed] = React.useState(0)
    React.useEffect(() => {
        if (!liveEntry) {
            setElapsed(0)
            return
        }
        const start = new Date(liveEntry.startTime).getTime()
        const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [liveEntry])

    // ── Drag + position ────────────────────────────────────────────────────
    const [mounted, setMounted] = React.useState(false)
    const [position, setPosition] = React.useState<Position>({ x: 0, y: 0 })
    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const sizeRef = React.useRef({ w: PILL_WIDTH_FALLBACK, h: PILL_HEIGHT_FALLBACK })

    const measure = React.useCallback(() => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        sizeRef.current = { w: rect.width, h: rect.height }
    }, [])

    React.useEffect(() => {
        measure()
        const { w, h } = sizeRef.current
        const stored = readStoredPosition()
        const initial = stored ?? defaultPosition(w, h)
        setPosition(clampToViewport(initial, w, h))
        setMounted(true)
    }, [measure])

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

    // Pointer-driven drag (no framer drag). Framer's `drag` was conflicting
    // with `animate={{ x: 0, y: 0 }}` and snapping the pill back to its
    // starting transform after drop. Using raw pointer events gives us
    // pixel-accurate placement and lets us persist on each move-end.
    const dragOffsetRef = React.useRef<{ dx: number; dy: number } | null>(null)
    const [dragging, setDragging] = React.useState(false)

    function handlePointerDownDrag(e: React.PointerEvent<HTMLDivElement>) {
        // Don't start drag from interactive controls; their wrappers stop propagation.
        if (e.button !== 0) return
        const node = containerRef.current
        if (!node) return
        const rect = node.getBoundingClientRect()
        dragOffsetRef.current = {
            dx: e.clientX - rect.left,
            dy: e.clientY - rect.top,
        }
        setDragging(true)
        node.setPointerCapture(e.pointerId)
    }

    function handlePointerMoveDrag(e: React.PointerEvent<HTMLDivElement>) {
        if (!dragging || !dragOffsetRef.current) return
        const { w, h } = sizeRef.current
        const next = clampToViewport(
            {
                x: e.clientX - dragOffsetRef.current.dx,
                y: e.clientY - dragOffsetRef.current.dy,
            },
            w,
            h,
        )
        setPosition(next)
    }

    function handlePointerUpDrag(e: React.PointerEvent<HTMLDivElement>) {
        if (!dragging) return
        const node = containerRef.current
        if (node?.hasPointerCapture(e.pointerId)) {
            node.releasePointerCapture(e.pointerId)
        }
        dragOffsetRef.current = null
        setDragging(false)
        writeStoredPosition(position)
    }

    // ── Start popover state ───────────────────────────────────────────────
    const [popoverOpen, setPopoverOpen] = React.useState(false)
    const [pickProjectId, setPickProjectId] = React.useState("")
    const [pickDescription, setPickDescription] = React.useState("")
    const [startError, setStartError] = React.useState<string | null>(null)

    async function handleStart() {
        setStartError(null)
        if (!pickDescription.trim()) {
            setStartError("What are you working on?")
            return
        }
        try {
            await startTimer.mutateAsync({
                projectId: pickProjectId || null,
                taskDescription: pickDescription.trim(),
            })
            setPopoverOpen(false)
            setPickDescription("")
            // Keep last-used project selected for next start
        } catch (err) {
            setStartError(err instanceof Error ? err.message : "Failed to start timer")
        }
    }

    async function handleStop() {
        if (!liveEntry) return
        try {
            await stopTimer.mutateAsync(liveEntry.id)
        } catch {
            /* surfaced via mutation state */
        }
    }

    // ── Render gates ──────────────────────────────────────────────────────
    if (isPublicSurface) return null
    if (!mounted) return null
    // Render on every dashboard page so the timer is always one click away.
    // The pill stays compact when idle (just the timer icon + Start button).

    const displayTime = isActive ? formatTime(elapsed) : "00:00:00"

    return (
        <>
            <motion.div
                ref={containerRef}
                style={{ position: "fixed", left: position.x, top: position.y, zIndex: 50, touchAction: "none" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ opacity: { duration: 0.2 } }}
                onPointerDown={handlePointerDownDrag}
                onPointerMove={handlePointerMoveDrag}
                onPointerUp={handlePointerUpDrag}
                onPointerCancel={handlePointerUpDrag}
                className={cn(
                    "flex items-center gap-2 bg-zinc-900 shadow-lg rounded-full pl-2 pr-3 py-2 select-none",
                    dragging ? "cursor-grabbing" : "cursor-grab",
                    isActive && "ring-2 ring-blue-500 ring-offset-2",
                )}
            >
                <div className="text-zinc-500" aria-label="Drag handle">
                    <GripVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
                </div>

                <div className="flex items-center gap-2 pr-2 border-r border-zinc-700">
                    <Timer className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                    <span className="text-sm font-mono text-white tracking-widest tabular-nums">
                        {displayTime}
                    </span>
                    {isActive && liveEntry && (
                        <span className="text-xs text-zinc-400 truncate max-w-[140px]" title={liveEntry.taskDescription}>
                            {liveEntry.taskDescription}
                        </span>
                    )}
                </div>

                <div
                    className="flex items-center gap-1"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {!isActive ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Start timer"
                            onClick={() => setPopoverOpen(true)}
                            disabled={startTimer.isPending}
                            className="h-8 w-8 text-white hover:bg-zinc-800 hover:text-white rounded-full"
                        >
                            {startTimer.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4 fill-current" />
                            )}
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Stop timer"
                            onClick={handleStop}
                            disabled={stopTimer.isPending}
                            className="h-8 w-8 text-white hover:bg-zinc-800 hover:text-white rounded-full"
                        >
                            {stopTimer.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Square className="h-4 w-4 fill-current" />
                            )}
                        </Button>
                    )}
                </div>
            </motion.div>

            {popoverOpen && (
                <StartPopover
                    projects={projects.map((p) => ({ id: p.id, label: p.name, client: p.client }))}
                    projectId={pickProjectId}
                    onProjectChange={setPickProjectId}
                    description={pickDescription}
                    onDescriptionChange={setPickDescription}
                    error={startError}
                    onCancel={() => {
                        setPopoverOpen(false)
                        setStartError(null)
                    }}
                    onStart={handleStart}
                    pending={startTimer.isPending}
                />
            )}
        </>
    )
}

// ---------------------------------------------------------------------------
// StartPopover — "what are you working on?" before starting the timer.
// Once we have a tasks table per project, this gains a Task select filtered
// by project. Today projects-as-tasks aren't structured; description-only
// captures the work item.
// ---------------------------------------------------------------------------

function StartPopover({
    projects,
    projectId,
    onProjectChange,
    description,
    onDescriptionChange,
    error,
    onCancel,
    onStart,
    pending,
}: {
    projects: { id: string; label: string; client?: string }[]
    projectId: string
    onProjectChange: (id: string) => void
    description: string
    onDescriptionChange: (s: string) => void
    error: string | null
    onCancel: () => void
    onStart: () => void
    pending: boolean
}) {
    React.useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onCancel()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [onCancel])

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/30"
                onClick={onCancel}
            />
            <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-zinc-900">Start timer</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Pick the project and describe what you&apos;re working on.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close start timer"
                        onClick={onCancel}
                        className="text-zinc-400 hover:text-zinc-700"
                    >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-700">
                        Project <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <select
                        value={projectId}
                        onChange={(e) => onProjectChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    >
                        <option value="">No project (untracked time)</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.label}
                                {p.client && p.client !== "Unknown Client" ? ` — ${p.client}` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-700">
                        What are you working on?
                    </label>
                    <input
                        autoFocus
                        type="text"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                onStart()
                            }
                        }}
                        placeholder="e.g. Designing hero section"
                        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    />
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={onCancel} disabled={pending}>
                        Cancel
                    </Button>
                    <Button onClick={onStart} disabled={pending} className="gap-2">
                        {pending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                Starting…
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4 fill-current" />
                                Start
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
