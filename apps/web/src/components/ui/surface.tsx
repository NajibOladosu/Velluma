import * as React from "react"
import { cn } from "@/lib/utils"

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> { }

/**
 * Surface (BentoCard primitive)
 * The base container standardizing bg-white, crisp borders, and max rounded-lg geometry.
 * No external margins and NO structural drop shadows.
 */
const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("rounded-lg border border-zinc-200 bg-white shadow-none", className)}
                {...props}
            />
        )
    }
)
Surface.displayName = "Surface"

export { Surface }
