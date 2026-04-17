"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface PricingTierCardProps {
    title: string
    price: string
    description: string
    features: string[]
    isSelected?: boolean
    onSelect?: () => void
    className?: string
}

export function PricingTierCard({
    title,
    price,
    description,
    features,
    isSelected,
    onSelect,
    className,
}: PricingTierCardProps) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
            className={cn(
                "group flex items-start gap-4 p-5 rounded-lg border bg-white cursor-pointer transition-all duration-200",
                isSelected
                    ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50/50"
                    : "border-zinc-200 hover:border-zinc-300",
                className
            )}
        >
            {/* Radio indicator */}
            <div className="mt-0.5 shrink-0">
                <div
                    className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected ? "border-zinc-900" : "border-zinc-300 group-hover:border-zinc-400"
                    )}
                >
                    {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-zinc-900" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="font-semibold text-zinc-900 text-sm">{title}</span>
                    <span className="text-lg font-bold text-zinc-900 shrink-0">{price}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 mb-3">{description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {features.map((feature, i) => (
                        <span key={i} className="flex items-center gap-1.5 text-xs text-zinc-600">
                            <Check className="h-3 w-3 text-zinc-400 shrink-0" strokeWidth={2.5} />
                            {feature}
                        </span>
                    ))}
                </div>
            </div>

            {/* Select button */}
            <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="shrink-0 self-center"
                onClick={(e) => {
                    e.stopPropagation()
                    onSelect?.()
                }}
            >
                {isSelected ? "Selected" : "Select"}
            </Button>
        </div>
    )
}
