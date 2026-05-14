"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Minimal in-house toast primitive — no external dep.
 *
 * Usage:
 *   const { toast } = useToast()
 *   toast({ title: "Saved", variant: "success" })
 *   toast({ title: "Failed", description: err.message, variant: "error" })
 *
 * Mount <ToastProvider>{children}</ToastProvider> once near the app root.
 * The provider owns the queue and the portal at bottom-right.
 */

export type ToastVariant = "default" | "success" | "error" | "info"

export interface ToastOptions {
    title: string
    description?: string
    variant?: ToastVariant
    /** ms before auto-dismiss. Default 4000. 0 = sticky. */
    duration?: number
    /** Optional action button on the right. */
    action?: {
        label: string
        onClick: () => void
    }
}

interface ToastEntry extends Required<Omit<ToastOptions, "action" | "description">> {
    id: number
    description?: string
    action?: ToastOptions["action"]
}

interface ToastContext {
    toast: (opts: ToastOptions) => void
    dismiss: (id: number) => void
}

const Ctx = React.createContext<ToastContext | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastEntry[]>([])
    const idRef = React.useRef(0)

    const dismiss = React.useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const toast = React.useCallback((opts: ToastOptions) => {
        const id = ++idRef.current
        const entry: ToastEntry = {
            id,
            title: opts.title,
            description: opts.description,
            variant: opts.variant ?? "default",
            duration: opts.duration ?? 4000,
            action: opts.action,
        }
        setToasts((prev) => [...prev, entry])
        if (entry.duration > 0) {
            setTimeout(() => dismiss(id), entry.duration)
        }
    }, [dismiss])

    const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss])

    return (
        <Ctx.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </Ctx.Provider>
    )
}

export function useToast(): ToastContext {
    const ctx = React.useContext(Ctx)
    if (!ctx) {
        // Soft fallback so calls outside the provider don't crash — they
        // log + degrade to console. Pages should always be wrapped.
        return {
            toast: (o) => console.warn("[toast: provider missing]", o),
            dismiss: () => {},
        }
    }
    return ctx
}

// ─────────────────────────────────────────────────────────────────────────────
// Viewport — fixed bottom-right stack
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bar: string; icon: React.ElementType; iconClass: string }> = {
    default: { bar: "bg-zinc-900",   icon: Info,         iconClass: "text-white" },
    success: { bar: "bg-emerald-600", icon: CheckCircle2, iconClass: "text-white" },
    error:   { bar: "bg-red-600",     icon: AlertCircle,  iconClass: "text-white" },
    info:    { bar: "bg-blue-600",    icon: Info,         iconClass: "text-white" },
}

function ToastViewport({
    toasts,
    onDismiss,
}: {
    toasts: ToastEntry[]
    onDismiss: (id: number) => void
}) {
    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] w-full sm:w-[380px]">
            {toasts.map((t) => {
                const variant = VARIANT_STYLES[t.variant]
                const Icon = variant.icon
                return (
                    <div
                        key={t.id}
                        role="status"
                        aria-live="polite"
                        className={cn(
                            "pointer-events-auto rounded-lg border border-zinc-200 bg-white shadow-lg",
                            "flex items-stretch overflow-hidden",
                            "animate-in fade-in slide-in-from-bottom-2 duration-200",
                        )}
                    >
                        <div className={cn("w-1 shrink-0", variant.bar)} />
                        <div className={cn("p-3 flex items-start gap-2.5 min-w-0 flex-1")}>
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0", variant.bar)}>
                                <Icon className={cn("h-3 w-3", variant.iconClass)} strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <P className="text-sm font-medium text-zinc-900 truncate">{t.title}</P>
                                {t.description && (
                                    <p className="text-xs text-zinc-600 mt-0.5 line-clamp-3">{t.description}</p>
                                )}
                            </div>
                            {t.action && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        t.action!.onClick()
                                        onDismiss(t.id)
                                    }}
                                    className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-50 transition-colors shrink-0"
                                >
                                    {t.action.label}
                                </button>
                            )}
                            <button
                                type="button"
                                aria-label="Dismiss"
                                onClick={() => onDismiss(t.id)}
                                className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// Local typography to avoid pulling the typography module into this file's
// minimal surface area.
function P({ className, children }: { className?: string; children: React.ReactNode }) {
    return <p className={className}>{children}</p>
}
