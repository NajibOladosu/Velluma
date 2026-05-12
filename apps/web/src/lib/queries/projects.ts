/**
 * TanStack Query hooks for Projects.
 *
 * Data strategy: `projects` table is queried directly. RLS policy
 * "projects_owner_select" surfaces only rows where `user_id = auth.uid()` or
 * the Tenant Isolation policy matches `tenant_id = get_user_tenant_id()`.
 *
 * Milestones (kanban board) are fetched separately through the API Gateway,
 * which calls the project microservice.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { api } from "@/lib/api-client"

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

export interface ProjectRow {
  id: string
  tenant_id: string | null
  client_id: string | null
  title: string
  description: string | null
  status: string
  total_budget: number | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  crm_clients?: { name: string } | null
}

// ---------------------------------------------------------------------------
// UI-facing type
// ---------------------------------------------------------------------------

export type ProjectStatus = "active" | "completed" | "on-hold"

export interface Project {
  id: string
  name: string
  client: string
  clientId: string
  status: ProjectStatus
  progress: number
  value: string
  nextMilestone: string
  totalBudget: number
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
  kanban: (id: string) => [...projectKeys.all, "kanban", id] as const,
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapDbToProjectStatus(dbStatus: string): ProjectStatus {
  if (dbStatus === "completed") return "completed"
  if (dbStatus === "on-hold" || dbStatus === "paused") return "on-hold"
  return "active"
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function mapRowToProject(row: ProjectRow): Project {
  const totalBudget = Number(row.total_budget) || 0
  const meta = row.metadata ?? {}
  const progress = (meta.progress as number) ?? 0

  return {
    id: row.id,
    name: row.title,
    client: row.crm_clients?.name ?? "Unknown Client",
    clientId: row.client_id ?? "",
    status: mapDbToProjectStatus(row.status),
    progress,
    value: totalBudget > 0 ? formatCurrency(totalBudget) : "—",
    nextMilestone: (meta.next_milestone as string) ?? "—",
    totalBudget,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all projects for the current user's tenant. */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async (): Promise<Project[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .select("*, crm_clients(name)")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return ((data ?? []) as ProjectRow[]).map(mapRowToProject)
    },
  })
}

/** Fetch a single project with full details. */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<Project> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .select("*, crm_clients(name)")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProject(data as ProjectRow)
    },
    enabled: Boolean(id),
  })
}

// ---------------------------------------------------------------------------
// Project detail hub aggregate
//
// Pulls everything the project detail page needs in one round-trip:
//   - project row + linked client
//   - primary contract (status/total/payment_type/number)
//   - linked proposal id (for the breadcrumb)
//   - time entries (count + total minutes + billable revenue + cost)
//   - expenses (count + total reimbursable)
//   - invoices (count + invoiced amount + paid amount)
//   - escrow positions (held amount)
//
// Cheap to compute server-side because each table is filtered by project_id.
// ---------------------------------------------------------------------------

export interface ProjectDetail {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  rawStatus: string
  client: { id: string | null; name: string | null }
  clientEmail: string | null
  totalBudget: number
  currency: string
  pricingMode: "fixed" | "milestone" | "hourly" | "retainer" | null
  proposalId: string | null
  createdAt: string
  updatedAt: string

  primaryContract: {
    id: string
    number: string | null
    status: string
    paymentType: "fixed" | "milestone" | "hourly" | "retainer"
    totalAmount: number
    currency: string
  } | null

  // Rollups
  hoursLogged: number
  hoursBillable: number
  timeRevenue: number
  expensesTotal: number
  invoicedAmount: number
  paidAmount: number
  escrowHeld: number
}

interface ContractMini {
  id: string
  contract_number: string | null
  status: string
  payment_type: "fixed" | "milestone" | "hourly" | "retainer"
  total_amount: number | null
  currency: string | null
}

export function useProjectDetail(id: string) {
  return useQuery({
    queryKey: [...projectKeys.detail(id), "hub"],
    queryFn: async (): Promise<ProjectDetail> => {
      const supabase = createClient()

      const [
        projectRes,
        contractsRes,
        timeRes,
        expensesRes,
        paymentsRes,
        escrowsRes,
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("*, crm_clients(id, name, email)")
          .eq("id", id)
          .single(),
        supabase
          .from("contracts")
          .select("id, contract_number, status, payment_type, total_amount, currency, client_email")
          .eq("project_id", id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("time_entries")
          .select("duration_minutes, hourly_rate, status")
          .eq("project_id", id),
        supabase
          .from("expenses")
          .select("amount, status, currency")
          .eq("project_id", id),
        supabase
          .from("contract_payments")
          .select("amount, status, currency")
          .eq("project_id", id),
        supabase
          .from("escrow_ledger")
          .select("amount, status, contract_id")
          .in(
            "contract_id",
            // Fed below from contracts; one extra round-trip to keep this
            // hook simple and avoid stringly-typed array literals.
            [(await supabase
              .from("contracts")
              .select("id")
              .eq("project_id", id)
              .limit(1)
              .maybeSingle()).data?.id ?? "00000000-0000-0000-0000-000000000000"],
          ),
      ])

      if (projectRes.error) throw new Error(projectRes.error.message)
      const project = projectRes.data as ProjectRow & {
        crm_clients?: { id: string; name: string; email: string | null } | null
      }
      const meta = (project.metadata ?? {}) as Record<string, unknown>

      const contractRow = (contractsRes.data ?? [])[0] as
        | (ContractMini & { client_email: string | null })
        | undefined

      // Rollups
      let hoursLogged = 0
      let hoursBillable = 0
      let timeRevenue = 0
      for (const te of (timeRes.data ?? []) as {
        duration_minutes: number | null
        hourly_rate: number | null
        status: string
      }[]) {
        const mins = Number(te.duration_minutes) || 0
        const rate = Number(te.hourly_rate) || 0
        hoursLogged += mins / 60
        if (rate > 0) {
          hoursBillable += mins / 60
          timeRevenue += (mins / 60) * rate
        }
      }

      const expensesTotal = (expensesRes.data ?? []).reduce(
        (s, e) => s + (Number((e as { amount: number }).amount) || 0),
        0,
      )

      let invoicedAmount = 0
      let paidAmount = 0
      for (const p of (paymentsRes.data ?? []) as { amount: number; status: string }[]) {
        const amt = Number(p.amount) || 0
        invoicedAmount += amt
        if (p.status === "completed") paidAmount += amt
      }

      const escrowHeld = (escrowsRes.data ?? [])
        .filter((e) => (e as { status: string }).status === "active" || (e as { status: string }).status === "held" || (e as { status: string }).status === "funded")
        .reduce((s, e) => s + (Number((e as { amount: number }).amount) || 0), 0)

      const pricingMode =
        (meta.pricing_mode as ProjectDetail["pricingMode"]) ??
        contractRow?.payment_type ??
        null

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        status: mapDbToProjectStatus(project.status),
        rawStatus: project.status,
        client: {
          id: project.crm_clients?.id ?? project.client_id ?? null,
          name: project.crm_clients?.name ?? null,
        },
        clientEmail:
          project.crm_clients?.email ?? contractRow?.client_email ?? null,
        totalBudget: Number(project.total_budget) || 0,
        currency:
          (meta.currency as string) ?? contractRow?.currency ?? "USD",
        pricingMode,
        proposalId:
          (project as ProjectRow & { proposal_id?: string | null })
            .proposal_id ?? null,
        createdAt: project.created_at,
        updatedAt: project.updated_at,

        primaryContract: contractRow
          ? {
              id: contractRow.id,
              number: contractRow.contract_number ?? null,
              status: contractRow.status,
              paymentType: contractRow.payment_type,
              totalAmount: Number(contractRow.total_amount) || 0,
              currency: contractRow.currency ?? "USD",
            }
          : null,

        hoursLogged,
        hoursBillable,
        timeRevenue,
        expensesTotal,
        invoicedAmount,
        paidAmount,
        escrowHeld,
      }
    },
    enabled: Boolean(id),
  })
}

/** Fetch kanban board data (milestones) for a project via API Gateway. */
export interface KanbanData {
  columns: { id: string; title: string; cards: { id: string; title: string; status: string }[] }[]
}

export function useProjectKanban(projectId: string) {
  return useQuery({
    queryKey: projectKeys.kanban(projectId),
    queryFn: async (): Promise<KanbanData> => {
      return api.get(`/projects/${projectId}/kanban`)
    },
    enabled: Boolean(projectId),
  })
}

/** Create a new project. */
export interface CreateProjectPayload {
  title: string
  /** Optional — internal/scoping projects can exist without a client. */
  clientId?: string | null
  description?: string
  totalBudget?: number
  status?: string
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // tenant_id is NOT NULL in the schema. Use the user's profile tenant
      // when present; fall back to user.id (the convention used elsewhere in
      // the codebase — see expenses/time queries) so newly-signed-up users
      // without a fully-provisioned profile row can still create projects.
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle()
      const tenantId = profile?.tenant_id ?? user.id

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            tenant_id: tenantId,
            user_id: user.id,
            client_id: payload.clientId ?? null,
            title: payload.title,
            description: payload.description ?? null,
            status: payload.status ?? "active",
            total_budget: payload.totalBudget ?? null,
          },
        ])
        .select("*, crm_clients(name)")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProject(data as ProjectRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/** Update an existing project. */
export interface UpdateProjectPayload {
  id: string
  title?: string
  description?: string
  status?: string
  totalBudget?: number
  metadata?: Record<string, unknown>
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title, description, status, totalBudget, metadata }: UpdateProjectPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .update({
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(totalBudget !== undefined && { total_budget: totalBudget }),
          ...(metadata !== undefined && { metadata }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*, crm_clients(name)")
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProject(data as ProjectRow)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/** Delete a project. */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/** Create a new milestone for a project via API Gateway. */
export interface CreateMilestonePayload {
  projectId: string
  title: string
  dueDate?: string
  amount?: number
}

export function useCreateMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMilestonePayload) => {
      return api.post("/projects/milestones", payload)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.kanban(variables.projectId) })
    },
  })
}
