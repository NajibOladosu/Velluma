import { redirect } from "next/navigation"

/**
 * /analytics merged into /insights (§9). Performance tab is the default.
 * Old links + bookmarks still work via this server-side redirect.
 */
export default function AnalyticsRedirect() {
    redirect("/insights")
}
