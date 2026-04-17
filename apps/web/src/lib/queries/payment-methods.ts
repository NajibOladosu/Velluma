/**
 * TanStack Query hooks for the freelancer's connected withdrawal methods.
 *
 * Data source: `withdrawal_methods` table — each row is a payout rail
 * (Stripe, Wise, PayPal, Payoneer, local) that the freelancer has connected.
 * Only active + verified rows are shown as selectable options.
 */
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentRail = "stripe" | "wise" | "payoneer" | "paypal" | "local"

export interface WithdrawalMethod {
  id: string
  rail: PaymentRail
  label: string
  accountName: string | null
  lastFour: string | null
  providerName: string | null
  currency: string
  country: string
  supportsInstant: boolean
  processingTime: string
  isDefault: boolean
  isVerified: boolean
}

interface WithdrawalMethodRow {
  id: string
  rail: string
  label: string
  account_name: string | null
  last_four: string | null
  provider_name: string | null
  currency: string
  country: string
  supports_instant: boolean
  processing_time: string
  is_default: boolean
  is_verified: boolean
}

// ---------------------------------------------------------------------------
// Rail metadata — icons and display labels
// ---------------------------------------------------------------------------

export const RAIL_META: Record<PaymentRail, { icon: string; displayName: string }> = {
  stripe: { icon: "💳", displayName: "Stripe" },
  wise: { icon: "🌍", displayName: "Wise" },
  payoneer: { icon: "🟠", displayName: "Payoneer" },
  paypal: { icon: "🅿️", displayName: "PayPal" },
  local: { icon: "🏦", displayName: "Bank Transfer" },
}

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const paymentMethodKeys = {
  all: ["paymentMethods"] as const,
  list: () => [...paymentMethodKeys.all, "list"] as const,
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapRow(row: WithdrawalMethodRow): WithdrawalMethod {
  return {
    id: row.id,
    rail: row.rail as PaymentRail,
    label: row.label,
    accountName: row.account_name,
    lastFour: row.last_four,
    providerName: row.provider_name,
    currency: row.currency,
    country: row.country,
    supportsInstant: row.supports_instant,
    processingTime: row.processing_time,
    isDefault: row.is_default,
    isVerified: row.is_verified,
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Fetch all active + verified withdrawal methods for the current user. */
export function usePaymentMethods() {
  return useQuery({
    queryKey: paymentMethodKeys.list(),
    queryFn: async (): Promise<WithdrawalMethod[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("withdrawal_methods")
        .select(
          "id, rail, label, account_name, last_four, provider_name, currency, country, supports_instant, processing_time, is_default, is_verified"
        )
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) throw new Error(error.message)
      return ((data ?? []) as WithdrawalMethodRow[]).map(mapRow)
    },
  })
}
