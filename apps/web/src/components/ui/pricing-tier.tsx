"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Surface } from "./surface"
import { Button } from "./button"
import { H3, P, Muted } from "./typography"

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
        <Surface
            className={cn(
                "flex flex-col p-6 transition-all duration-200 cursor-pointer",
                isSelected
                    ? "border-zinc-900 ring-1 ring-zinc-900"
                    : "hover:border-zinc-300",
                className
            )}
            onClick={onSelect}
        >
            <div className="mb-4">
                <H3 className="text-zinc-900 mb-1">{title}</H3>
                <P className="text-2xl font-semibold tracking-tight text-zinc-900">
                    {price}
                </P>
                <Muted className="mt-2 block">{description}</Muted>
            </div>

            <div className="space-y-3 mb-8 flex-1">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <Check className="h-4 w-4 text-zinc-900 mt-0.5" strokeWidth={2.5} />
                        <span className="text-xs text-zinc-600 leading-tight">{feature}</span>
                    </div>
                ))}
            </div>

            <Button
                variant={isSelected ? "default" : "outline"}
                className="w-full"
                onClick={(e) => {
                    e.stopPropagation()
                    onSelect?.()
                }}
            >
                {isSelected ? "Selected" : "Select Tier"}
            </Button>
        </Surface>
    )
}
