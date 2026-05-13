/**
 * TanStack Query hooks for the Clients CRM.
 *
 * Data strategy: query Supabase directly from the browser client using
 * the authenticated session cookie. RLS policies on `crm_clients` ensure
 * users can only read rows where tenant_id = auth.uid().
 *
 * metadata JSONB keys:
 *   status:              "active" | "lead" | "past"
 *   total_revenue:       number
 *   source:              string
 *   enrichment:          { company_size, industry, confidence, linkedin, twitter }
 *   notes:               string[]
 *   secondary_contacts:  { name, role, email, portal_access }[]
 *   custom_fields:       { label, value, type }[]
 *   timeline:            { action, time, type }[]
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------
export interface ClientRow {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  website: string | null
  linkedin_profile: string | null
  health_score: number | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------
export interface CreateClientPayload {
  name: string
  email?: string
  phone?: string
  company_name?: string
  website?: string
  tags?: string[]
  status?: "active" | "lead" | "past"
  source?: string
}

export interface UpdateClientPayload {
  id: string
  name?: string
  email?: string
  phone?: string
  company_name?: string
  website?: string
  linkedin_profile?: string
  tags?: string[]
  health_score?: number
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------
export const clientKeys = {
  all:     ["clients"] as const,
  lists:   () => [...clientKeys.all, "list"] as const,
  detail:  (id: string) => [...clientKeys.all, "detail", id] as const,
  rollup:  (id: string) => [...clientKeys.all, "rollup", id] as const,
  rollups: () => [...clientKeys.all, "rollups"] as const,
}

// ---------------------------------------------------------------------------
// Rollup types — what the client detail / list pages need
// ---------------------------------------------------------------------------

export interface ClientProjectRollup {
  id: string
  title: string
  status: string
  totalBudget: number
}

export interface ClientContractRollup {
  id: string
  title: string
  contractNumber: string | null
  status: string
  totalAmount: number
  currency: string
}

export interface ClientInvoiceRollup {
  id: string
  invoiceNumber: string | null
  amount: number
  currency: string
  status: string
  sentAt: string | null
  paidAt: string | null
}

export interface ClientRollup {
  projects: ClientProjectRollup[]
  contracts: ClientContractRollup[]
  invoices: ClientInvoiceRollup[]
  /** SUM of invoices.amount WHERE status='completed' */
  lifetimeRevenue: number
  /** SUM of invoices.amount regardless of status (billed pipeline) */
  invoicedTotal: number
  /** Currency of the most recent invoice/contract, defaults to USD */
  currency: string
}

/**
 * One-row rollup for a single client: linked projects, contracts, invoices,
 * and lifetime revenue. Drives the client detail page sections.
 */
export function useClientRollup(clientId: string) {
  return useQuery({
    queryKey: clientKeys.rollup(clientId),
    queryFn: async (): Promise<ClientRollup> => {
      const supabase = createClient()
      const [projectsRes, contractsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, title, status, total_budget")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("contracts")
          .select("id, title, contract_number, status, total_amount, currency")
          .eq("crm_client_id", clientId)
          .order("created_at", { ascending: false }),
      ])

      const contracts: ClientContractRollup[] = ((contractsRes.data ?? []) as Array<{
        id: string
        title: string
        contract_number: string | null
        status: string
        total_amount: number | null
        currency: string | null
      }>).map((c) => ({
        id: c.id,
        title: c.title,
        contractNumber: c.contract_number,
        status: c.status,
        totalAmount: Number(c.total_amount) || 0,
        currency: c.currency ?? "USD",
      }))

      // Invoices via the client's contracts. If the client has no contract,
      // skip the second query.
      let invoices: ClientInvoiceRollup[] = []
      if (contracts.length > 0) {
        const { data: invs } = await supabase
          .from("contract_payments")
          .select("id, invoice_number, amount, currency, status, sent_at, completed_at")
          .in("contract_id", contracts.map((c) => c.id))
          .order("created_at", { ascending: false })
        invoices = ((invs ?? []) as Array<{
          id: string
          invoice_number: string | null
          amount: number
          currency: string | null
          status: string
          sent_at: string | null
          completed_at: string | null
        }>).map((p) => ({
          id: p.id,
          invoiceNumber: p.invoice_number,
          amount: Number(p.amount) || 0,
          currency: p.currency ?? "USD",
          status: p.status,
          sentAt: p.sent_at,
          paidAt: p.completed_at,
        }))
      }

      const lifetimeRevenue = invoices
        .filter((i) => i.status === "completed")
        .reduce((s, i) => s + i.amount, 0)
      const invoicedTotal = invoices.reduce((s, i) => s + i.amount, 0)
      const currency =
        invoices[0]?.currency ?? contracts[0]?.currency ?? "USD"

      const projects: ClientProjectRollup[] = ((projectsRes.data ?? []) as Array<{
        id: string
        title: string
        status: string
        total_budget: number | null
      }>).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        totalBudget: Number(p.total_budget) || 0,
      }))

      return {
        projects,
        contracts,
        invoices,
        lifetimeRevenue,
        invoicedTotal,
        currency,
      }
    },
    enabled: Boolean(clientId),
  })
}

/**
 * List-side rollup: one row per client with lifetimeRevenue + project count
 * — used for the Clients list page columns. Single round-trip aggregation
 * is implemented client-side for simplicity (small N today; switch to a
 * server-side view when client count grows).
 */
export function useClientsRollupMap() {
  return useQuery({
    queryKey: clientKeys.rollups(),
    queryFn: async (): Promise<
      Record<string, { lifetimeRevenue: number; invoicedTotal: number; projects: number }>
    > => {
      const supabase = createClient()
      const [contractsRes, paymentsRes, projectsRes] = await Promise.all([
        supabase.from("contracts").select("id, crm_client_id"),
        supabase.from("contract_payments").select("contract_id, amount, status"),
        supabase.from("projects").select("id, client_id"),
      ])

      // contract.id → crm_client_id
      const contractToClient = new Map<string, string>()
      for (const c of (contractsRes.data ?? []) as Array<{ id: string; crm_client_id: string | null }>) {
        if (c.crm_client_id) contractToClient.set(c.id, c.crm_client_id)
      }

      const out: Record<string, { lifetimeRevenue: number; invoicedTotal: number; projects: number }> = {}

      for (const p of (paymentsRes.data ?? []) as Array<{
        contract_id: string | null
        amount: number
        status: string
      }>) {
        if (!p.contract_id) continue
        const clientId = contractToClient.get(p.contract_id)
        if (!clientId) continue
        const bucket = (out[clientId] ??= { lifetimeRevenue: 0, invoicedTotal: 0, projects: 0 })
        const amt = Number(p.amount) || 0
        bucket.invoicedTotal += amt
        if (p.status === "completed") bucket.lifetimeRevenue += amt
      }

      for (const pr of (projectsRes.data ?? []) as Array<{ client_id: string | null }>) {
        if (!pr.client_id) continue
        const bucket = (out[pr.client_id] ??= { lifetimeRevenue: 0, invoicedTotal: 0, projects: 0 })
        bucket.projects += 1
      }

      return out
    },
  })
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all clients for the current user's tenant. */
export function useClients() {
  return useQuery({
    queryKey: clientKeys.lists(),
    queryFn: async (): Promise<ClientRow[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("crm_clients")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as ClientRow[]
    },
  })
}

/** Fetch a single client by ID. */
export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async (): Promise<ClientRow> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("crm_clients")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    enabled: Boolean(id),
  })
}

/** Create a new client. tenant_id = auth.uid() (profiles.id = auth.uid()). */
export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("crm_clients")
        .insert({
          tenant_id: user.id,
          name: payload.name,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          company_name: payload.company_name ?? null,
          website: payload.website ?? null,
          tags: payload.tags ?? [],
          metadata: {
            status: payload.status ?? "lead",
            total_revenue: 0,
            source: payload.source ?? "Manual Entry",
            enrichment: { company_size: "Unknown", industry: "Unknown", confidence: 0 },
            notes: [],
            secondary_contacts: [],
            custom_fields: [],
            timeline: [],
          },
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

/** Update top-level fields on a client. */
export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateClientPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("crm_clients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

/** Patch a subset of metadata keys (merges with existing metadata). */
export function useUpdateClientMeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, metaPatch }: { id: string; metaPatch: Record<string, unknown> }) => {
      const supabase = createClient()

      const { data: current } = await supabase
        .from("crm_clients")
        .select("metadata")
        .eq("id", id)
        .single()

      const merged = { ...(current?.metadata ?? {}), ...metaPatch }

      const { data, error } = await supabase
        .from("crm_clients")
        .update({ metadata: merged, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as ClientRow
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

/** Delete a client record. */
export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("crm_clients")
        .delete()
        .eq("id", id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}
