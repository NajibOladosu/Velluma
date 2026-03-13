"use client"

import * as React from "react"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Surface } from "./surface"
import { Button } from "./button"
import { Muted } from "./typography"

interface SignatureBlockProps {
    label?: string
    date?: string
    className?: string
    onSign?: () => void
}

export function SignatureBlock({
    label = "Freelancer Signature",
    date = new Date().toLocaleDateString(),
    className,
    onSign,
}: SignatureBlockProps) {
    const [isSigned, setIsSigned] = React.useState(false)

    return (
        <div className={cn("space-y-2 max-w-[300px]", className)}>
            <Surface
                className={cn(
                    "h-24 flex items-center justify-center bg-zinc-50 border-dashed transition-all relative overflow-hidden",
                    !isSigned && "hover:bg-zinc-100 cursor-pointer"
                )}
                onClick={() => {
                    if (!isSigned) {
                        setIsSigned(true)
                        onSign?.()
                    }
                }}
            >
                {!isSigned ? (
                    <div className="flex flex-col items-center gap-1">
                        <Pencil className="h-4 w-4 text-zinc-400" />
                        <Muted className="text-[10px] uppercase tracking-widest">Click to sign</Muted>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300">
                        <span className="font-serif italic text-2xl text-zinc-900">Signed Digitally</span>
                    </div>
                )}
            </Surface>

            <div className="flex items-center justify-between px-1">
                <Muted className="text-[10px] uppercase tracking-widest font-semibold">{label}</Muted>
                <Muted className="text-[10px] uppercase tracking-widest">{date}</Muted>
            </div>
        </div>
    )
}
