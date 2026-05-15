/**
 * Business profile is stored on the user's `profiles` row. Drives every
 * client-facing surface: proposal preview, contract smart fields, invoice
 * email, portal header, booking + lead-form public pages.
 *
 * Why one table not two: every read path is already keyed by user id; a
 * separate `business_profiles` table would force an extra join everywhere
 * for no functional gain.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export interface BusinessProfile {
  id: string
  // Identity
  displayName: string | null
  companyName: string | null
  legalBusinessName: string | null
  // Contact
  billingEmail: string | null
  website: string | null
  bio: string | null
  // Tax / locale
  taxId: string | null
  defaultCurrency: string
  defaultTimezone: string
  paymentTermsDays: number
  // Brand
  logoUrl: string | null
  avatarUrl: string | null
  brandAccentHex: string
  invoicePrefix: string
  /** Hides Submit/Approve/Reject buttons on time entries for solo accounts. */
  requiresTimeApproval: boolean
}

interface ProfileRow {
  id: string
  display_name: string | null
  company_name: string | null
  legal_business_name: string | null
  billing_email: string | null
  website: string | null
  bio: string | null
  tax_id: string | null
  default_currency: string
  default_timezone: string
  payment_terms_days: number
  logo_url: string | null
  avatar_url: string | null
  brand_accent_hex: string
  invoice_prefix: string
  requires_time_approval: boolean
}

function mapRow(r: ProfileRow): BusinessProfile {
  return {
    id: r.id,
    displayName: r.display_name,
    companyName: r.company_name,
    legalBusinessName: r.legal_business_name,
    billingEmail: r.billing_email,
    website: r.website,
    bio: r.bio,
    taxId: r.tax_id,
    defaultCurrency: r.default_currency,
    defaultTimezone: r.default_timezone,
    paymentTermsDays: r.payment_terms_days,
    logoUrl: r.logo_url,
    avatarUrl: r.avatar_url,
    brandAccentHex: r.brand_accent_hex,
    invoicePrefix: r.invoice_prefix,
    requiresTimeApproval: r.requires_time_approval ?? false,
  }
}

export const businessProfileKeys = {
  all: ["business-profile"] as const,
  me: () => [...businessProfileKeys.all, "me"] as const,
}

/**
 * Returns the freelancer's own business profile. The display name used
 * everywhere falls back through:
 *   legal_business_name → company_name → display_name → email local-part.
 */
export function useBusinessProfile() {
  return useQuery({
    queryKey: businessProfileKeys.me(),
    queryFn: async (): Promise<BusinessProfile | null> => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, company_name, legal_business_name, billing_email, " +
            "website, bio, tax_id, default_currency, default_timezone, " +
            "payment_terms_days, logo_url, avatar_url, brand_accent_hex, invoice_prefix, " +
            "requires_time_approval",
        )
        .eq("id", user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return null
      return mapRow(data as unknown as ProfileRow)
    },
  })
}

export interface UpdateBusinessProfilePayload {
  displayName?: string | null
  companyName?: string | null
  legalBusinessName?: string | null
  billingEmail?: string | null
  website?: string | null
  bio?: string | null
  taxId?: string | null
  defaultCurrency?: string
  defaultTimezone?: string
  paymentTermsDays?: number
  logoUrl?: string | null
  avatarUrl?: string | null
  brandAccentHex?: string
  invoicePrefix?: string
  requiresTimeApproval?: boolean
}

export function useUpdateBusinessProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: UpdateBusinessProfilePayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const patch: Record<string, unknown> = {}
      if (p.displayName !== undefined)       patch.display_name = p.displayName
      if (p.companyName !== undefined)       patch.company_name = p.companyName
      if (p.legalBusinessName !== undefined) patch.legal_business_name = p.legalBusinessName
      if (p.billingEmail !== undefined)      patch.billing_email = p.billingEmail
      if (p.website !== undefined)           patch.website = p.website
      if (p.bio !== undefined)               patch.bio = p.bio
      if (p.taxId !== undefined)             patch.tax_id = p.taxId
      if (p.defaultCurrency !== undefined)   patch.default_currency = p.defaultCurrency
      if (p.defaultTimezone !== undefined)   patch.default_timezone = p.defaultTimezone
      if (p.paymentTermsDays !== undefined)  patch.payment_terms_days = p.paymentTermsDays
      if (p.logoUrl !== undefined)           patch.logo_url = p.logoUrl
      if (p.avatarUrl !== undefined)         patch.avatar_url = p.avatarUrl
      if (p.brandAccentHex !== undefined)    patch.brand_accent_hex = p.brandAccentHex
      if (p.invoicePrefix !== undefined)     patch.invoice_prefix = p.invoicePrefix
      if (p.requiresTimeApproval !== undefined) patch.requires_time_approval = p.requiresTimeApproval
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return mapRow(data as unknown as ProfileRow)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: businessProfileKeys.all })
    },
  })
}

/**
 * Resolved business name with consistent fallback order. Use everywhere a
 * client-facing artifact needs to label the freelancer's business.
 */
export function businessDisplayName(
  profile: BusinessProfile | null | undefined,
  email?: string | null,
): string {
  return (
    profile?.legalBusinessName?.trim() ||
    profile?.companyName?.trim() ||
    profile?.displayName?.trim() ||
    email?.split("@")[0] ||
    "Velluma Workspace"
  )
}
