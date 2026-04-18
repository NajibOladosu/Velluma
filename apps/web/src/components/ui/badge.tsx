import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80",
                emerald:
                    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80",
                amber:
                    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/80",
                red:
                    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/80",
                outline: "text-zinc-900 border-zinc-200",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
