/**
 * Tests for the projects query hooks and helpers.
 *
 * Covers the key factory, status mapping, metadata extraction (progress,
 * nextMilestone), and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  projectKeys,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  type ProjectRow,
} from "./projects"

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@/utils/supabase/client"

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Sample DB row
// ---------------------------------------------------------------------------

const sampleProjectRow: ProjectRow = {
  id: "p1",
  tenant_id: "t1",
  client_id: "cl1",
  title: "E-commerce Platform",
  description: "Full stack rewrite",
  status: "active",
  total_budget: 15000,
  metadata: {
    progress: 42,
    next_milestone: "Q3 Launch",
  },
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
  clients: { name: "TechCorp" },
}

// ---------------------------------------------------------------------------
// 1. Key factory
// ---------------------------------------------------------------------------

describe("projectKeys", () => {
  it("all returns stable base key", () => {
    expect(projectKeys.all).toEqual(["projects"])
  })

  it("lists() scopes under all", () => {
    expect(projectKeys.lists()).toEqual(["projects", "list"])
  })

  it("detail() includes the id", () => {
    expect(projectKeys.detail("p1")).toEqual(["projects", "detail", "p1"])
  })

  it("kanban() includes the project id", () => {
    expect(projectKeys.kanban("p1")).toEqual(["projects", "kanban", "p1"])
  })

  it("kanban() is distinct from lists() and detail()", () => {
    expect(projectKeys.kanban("p1")).not.toEqual(projectKeys.lists())
    expect(projectKeys.kanban("p1")).not.toEqual(projectKeys.detail("p1"))
  })
})

// ---------------------------------------------------------------------------
// 2. useProjects — maps DB rows to UI Project shape
// ---------------------------------------------------------------------------

describe("useProjects", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns mapped projects from Supabase", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [sampleProjectRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const projects = result.current.data!
    expect(projects).toHaveLength(1)
    const p = projects[0]
    expect(p.id).toBe("p1")
    expect(p.name).toBe("E-commerce Platform")
    expect(p.client).toBe("TechCorp")
    expect(p.clientId).toBe("cl1")
    expect(p.status).toBe("active")
    expect(p.progress).toBe(42)
    expect(p.nextMilestone).toBe("Q3 Launch")
    expect(p.totalBudget).toBe(15000)
  })

  it("maps 'completed' DB status to 'completed'", async () => {
    const row = { ...sampleProjectRow, status: "completed" }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("completed")
  })

  it("maps 'on-hold' DB status to 'on-hold'", async () => {
    const row = { ...sampleProjectRow, status: "on-hold" }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("on-hold")
  })

  it("maps 'paused' DB status to 'on-hold'", async () => {
    const row = { ...sampleProjectRow, status: "paused" }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("on-hold")
  })

  it("maps unknown statuses to 'active'", async () => {
    const row = { ...sampleProjectRow, status: "in_progress" }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("active")
  })

  it("defaults progress to 0 when metadata is null", async () => {
    const row = { ...sampleProjectRow, metadata: null }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].progress).toBe(0)
    expect(result.current.data![0].nextMilestone).toBe("—")
  })

  it("uses '—' for value when total_budget is null", async () => {
    const row = { ...sampleProjectRow, total_budget: null }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].value).toBe("—")
  })

  it("throws when Supabase returns an error", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "RLS error" } }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("RLS error")
  })
})

// ---------------------------------------------------------------------------
// 3. useProject (single record)
// ---------------------------------------------------------------------------

describe("useProject", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("is disabled when id is empty", () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProject(""), {
      wrapper: wrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe("idle")
  })

  it("fetches a single project by id", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: sampleProjectRow, error: null }),
          }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProject("p1"), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.id).toBe("p1")
    expect(result.current.data!.name).toBe("E-commerce Platform")
  })
})

// ---------------------------------------------------------------------------
// 4. useCreateProject — mutation
// ---------------------------------------------------------------------------

describe("useCreateProject", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("inserts a project row with active status by default", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: sampleProjectRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    const profileSingleMock = vi.fn().mockResolvedValue({ data: { tenant_id: "t1" }, error: null })
    const profileEqMock = vi.fn().mockReturnValue({ single: profileSingleMock })
    const profileSelectMock = vi.fn().mockReturnValue({ eq: profileEqMock })

    const fromMock = vi.fn()
      .mockReturnValueOnce({ select: profileSelectMock }) // profiles
      .mockReturnValueOnce({ insert: insertMock }) // projects

    vi.mocked(createClient).mockReturnValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ title: "New Project", clientId: "cl1" })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ title: "New Project", client_id: "cl1", status: "active" }),
    ])
  })

  it("throws when not authenticated", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ title: "New Project", clientId: "cl1" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Not authenticated")
  })
})

// ---------------------------------------------------------------------------
// 5. useUpdateProject — mutation
// ---------------------------------------------------------------------------

describe("useUpdateProject", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("updates project fields", async () => {
    const updatedRow = { ...sampleProjectRow, title: "Updated Title" }
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "p1", title: "Updated Title" })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Updated Title" }))
    expect(result.current.data!.name).toBe("Updated Title")
  })

  it("throws when Supabase update fails", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: "Update error" } })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "p1", status: "completed" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Update error")
  })
})

// ---------------------------------------------------------------------------
// 6. useDeleteProject — mutation
// ---------------------------------------------------------------------------

describe("useDeleteProject", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("deletes the project row by id", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("p1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(eqMock).toHaveBeenCalledWith("id", "p1")
  })

  it("throws when Supabase delete fails", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("p1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Delete failed")
  })
})
