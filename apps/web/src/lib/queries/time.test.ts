/**
 * Tests for the time-tracking query hooks and helpers.
 *
 * Covers the key factory, duration formatting, total calculation,
 * and error handling for useTimeEntries.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  timeKeys,
  useTimeEntries,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  type TimeEntryRow,
} from "./time"

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

function makeSupabaseMock(resolvedData: unknown, error = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: resolvedData, error }),
        }),
      }),
    }),
    auth: { getUser: vi.fn() },
  }
}

// ---------------------------------------------------------------------------
// Sample DB row
// ---------------------------------------------------------------------------

const sampleRow: TimeEntryRow = {
  id: "te-1",
  contract_id: "c1",
  freelancer_id: "u1",
  task_description: "Design wireframes",
  start_time: "2026-03-01T09:00:00Z",
  end_time: "2026-03-01T12:00:00Z",
  duration_minutes: 180,
  hourly_rate: 100,
  status: "approved",
  created_at: "2026-03-01T09:00:00Z",
  tenant_id: "t1",
}

// ---------------------------------------------------------------------------
// 1. Key factory
// ---------------------------------------------------------------------------

describe("timeKeys", () => {
  it("all returns stable base key", () => {
    expect(timeKeys.all).toEqual(["time-entries"])
  })

  it("lists() scopes under all", () => {
    expect(timeKeys.lists()).toEqual(["time-entries", "list"])
  })

  it("running() is distinct from lists()", () => {
    expect(timeKeys.running()).toEqual(["time-entries", "running"])
    expect(timeKeys.running()).not.toEqual(timeKeys.lists())
  })
})

// ---------------------------------------------------------------------------
// 2. useTimeEntries — maps DB rows to UI TimeEntry shape
// ---------------------------------------------------------------------------

describe("useTimeEntries", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns mapped time entries from Supabase", async () => {
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([sampleRow]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const entries = result.current.data!
    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.id).toBe("te-1")
    expect(e.task).toBe("Design wireframes")
    expect(e.contractId).toBe("c1")
    expect(e.status).toBe("approved")
    expect(e.hourlyRate).toBe(100)
    expect(e.durationMinutes).toBe(180)
  })

  it("formats duration as 'Xh YYm'", async () => {
    const row = { ...sampleRow, duration_minutes: 195 } // 3h 15m
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].duration).toBe("3h 15m")
  })

  it("formats zero-minute duration as '—'", async () => {
    const row = { ...sampleRow, duration_minutes: null }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].duration).toBe("—")
  })

  it("calculates total correctly from duration and hourly rate", async () => {
    // 180 minutes @ $100/hr = $300.00
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([sampleRow]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].total).toBe("$300.00")
  })

  it("shows '—' total when hourly rate is null", async () => {
    const row = { ...sampleRow, hourly_rate: null }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].total).toBe("—")
  })

  it("preserves null endTime for running timers", async () => {
    const row = { ...sampleRow, end_time: null, duration_minutes: null }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].endTime).toBeNull()
  })

  it("returns empty array when Supabase returns null data", async () => {
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock(null) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it("throws when Supabase returns an error", async () => {
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock(null, { message: "RLS error" }) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("RLS error")
  })
})

// ---------------------------------------------------------------------------
// 3. useUpdateTimeEntry — mutation
// ---------------------------------------------------------------------------

describe("useUpdateTimeEntry", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("updates time entry fields", async () => {
    const updatedRow = { ...sampleRow, task_description: "Updated task" }
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateTimeEntry(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "te-1", taskDescription: "Updated task" })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ task_description: "Updated task" })
    )
    expect(result.current.data!.task).toBe("Updated task")
  })

  it("maps camelCase fields to snake_case column names", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: sampleRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateTimeEntry(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "te-1", hourlyRate: 120, durationMinutes: 90 })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ hourly_rate: 120, duration_minutes: 90 })
    )
  })

  it("throws when Supabase update fails", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateTimeEntry(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "te-1", status: "submitted" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Update failed")
  })
})

// ---------------------------------------------------------------------------
// 4. useDeleteTimeEntry — mutation
// ---------------------------------------------------------------------------

describe("useDeleteTimeEntry", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("deletes the time entry by id", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteTimeEntry(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("te-1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith("id", "te-1")
  })

  it("throws when Supabase delete fails", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteTimeEntry(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("te-1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Delete failed")
  })
})
