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
  clients?: { name: string } | null
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
    client: row.clients?.name ?? "Unknown Client",
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
        .select("*, clients(name)")
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
        .select("*, clients(name)")
        .eq("id", id)
        .single()

      if (error) throw new Error(error.message)
      return mapRowToProject(data as ProjectRow)
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
  clientId: string
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            tenant_id: profile?.tenant_id ?? null,
            client_id: payload.clientId,
            title: payload.title,
            description: payload.description ?? null,
            status: payload.status ?? "active",
            total_budget: payload.totalBudget ?? null,
          },
        ])
        .select("*, clients(name)")
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
        .select("*, clients(name)")
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
