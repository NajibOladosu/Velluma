import * as React from "react"
import { cn } from "@/lib/utils"

export const H1 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h1
            ref={ref}
            className={cn("text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl", className)}
            {...props}
        />
    )
)
H1.displayName = "H1"

export const H2 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h2
            ref={ref}
            className={cn("text-2xl font-semibold tracking-tight text-zinc-900", className)}
            {...props}
        />
    )
)
H2.displayName = "H2"

export const H3 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("text-xl font-medium tracking-tight text-zinc-900", className)}
            {...props}
        />
    )
)
H3.displayName = "H3"

export const P = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn("text-base leading-relaxed text-zinc-900", className)}
            {...props}
        />
    )
)
P.displayName = "P"

export const Muted = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, ...props }, ref) => (
        <span
            ref={ref}
            className={cn("text-sm font-medium text-zinc-500", className)}
            {...props}
        />
    )
)
Muted.displayName = "Muted"
