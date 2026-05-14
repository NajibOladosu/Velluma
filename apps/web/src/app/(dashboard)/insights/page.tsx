"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { H1, Muted } from "@/components/ui/typography"
import { BarChart3, PiggyBank } from "lucide-react"
import { AnalyticsView } from "@/components/insights/analytics-view"
import { ProfitabilityView } from "@/components/insights/profitability-view"

/**
 * Unified Insights page. Replaces the duplicate /analytics + /profitability
 * pages with a single route + two tabs:
 *
 *   Performance — business metrics (revenue, margin, win rate, cohorts)
 *   Tax         — quarterly estimates, tax buckets, hourly rate by contract
 *
 * The original AnalyticsView and ProfitabilityView each render their own
 * page header; this wrapper hides it via a `data-insights-tab` outer
 * container so the layout still feels like one page.
 */

type Tab = "performance" | "tax"

export default function InsightsPage() {
  // Read ?tab= via window.location to avoid the useSearchParams Suspense
  // bail-out that breaks static prerender (same pattern as the other
  // dashboard pages that needed this).
  const [tab, setTab] = React.useState<Tab>("performance")
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const t = new URLSearchParams(window.location.search).get("tab")
    if (t === "tax") setTab("tax")
  }, [])

  // Keep the URL in sync as the user clicks tabs (so /insights?tab=tax is
  // shareable / linkable from the sidebar or external doc).
  function selectTab(next: Tab) {
    setTab(next)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (next === "performance") url.searchParams.delete("tab")
    else url.searchParams.set("tab", next)
    window.history.replaceState({}, "", url.toString())
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <H1 className="sm:truncate">Insights</H1>
        <Muted className="sm:truncate">
          Business performance and tax planning, in one place.
        </Muted>
      </div>

      <div
        role="tablist"
        aria-label="Insights tabs"
        className="inline-flex bg-zinc-100/70 p-0.5 rounded-md border border-zinc-200"
      >
        {(
          [
            { key: "performance", label: "Performance", icon: BarChart3 },
            { key: "tax", label: "Tax planning", icon: PiggyBank },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded inline-flex items-center gap-1.5 transition-colors capitalize",
              tab === key
                ? "bg-white text-zinc-900 border border-zinc-200"
                : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      <div data-insights-tab={tab}>
        {tab === "performance" ? <AnalyticsView /> : <ProfitabilityView />}
      </div>
    </div>
  )
}
