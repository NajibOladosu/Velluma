import { redirect } from "next/navigation"

/**
 * /profitability merged into /insights (§9). Tax tab via ?tab=tax. Old
 * links + bookmarks still work via this server-side redirect.
 */
export default function ProfitabilityRedirect() {
    redirect("/insights?tab=tax")
}
