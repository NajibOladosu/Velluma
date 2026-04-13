/**
 * Tests for the automations query hooks and helpers.
 *
 * Covers the key factory, useAutomations mapping (is_active → enabled,
 * conditions.run_count → runs, conditions.description → description),
 * and useToggleAutomation mutation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  automationKeys,
  useAutomations,
  useToggleAutomation,
  type AutomationRuleRow,
} from "./automations"

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

const sampleRow: AutomationRuleRow = {
  id: "auto-1",
  tenant_id: "t1",
  name: "Follow-up Email",
  trigger: "proposal_sent",
  action: "send_email",
  conditions: {
    description: "Send follow-up 3 days after proposal",
    run_count: 12,
  },
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
}

// ---------------------------------------------------------------------------
// 1. Key factory
// ---------------------------------------------------------------------------

describe("automationKeys", () => {
  it("all returns stable base key", () => {
    expect(automationKeys.all).toEqual(["automations"])
  })

  it("lists() scopes under all", () => {
    expect(automationKeys.lists()).toEqual(["automations", "list"])
  })
})

// ---------------------------------------------------------------------------
// 2. useAutomations — maps DB rows to UI Automation shape
// ---------------------------------------------------------------------------

describe("useAutomations", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns mapped automations from Supabase", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [sampleRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useAutomations(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const items = result.current.data!
    expect(items).toHaveLength(1)
    const a = items[0]
    expect(a.id).toBe("auto-1")
    expect(a.name).toBe("Follow-up Email")
    expect(a.trigger).toBe("proposal_sent")
    expect(a.action).toBe("send_email")
    expect(a.enabled).toBe(true)
    expect(a.runs).toBe(12)
    expect(a.description).toBe("Send follow-up 3 days after proposal")
  })

  it("maps is_active=false to enabled=false", async () => {
    const row = { ...sampleRow, is_active: false }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useAutomations(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].enabled).toBe(false)
  })

  it("defaults runs to 0 when run_count is missing", async () => {
    const row = { ...sampleRow, conditions: {} }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useAutomations(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].runs).toBe(0)
  })

  it("defaults description to empty string when missing", async () => {
    const row = { ...sampleRow, conditions: { run_count: 5 } }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useAutomations(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].description).toBe("")
  })

  it("throws when Supabase returns an error", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useAutomations(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("DB error")
  })
})

// ---------------------------------------------------------------------------
// 3. useToggleAutomation — mutation
// ---------------------------------------------------------------------------

describe("useToggleAutomation", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("calls Supabase update with is_active toggle", async () => {
    const updatedRow = { ...sampleRow, is_active: false }
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useToggleAutomation(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "auto-1", enabled: false })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateMock).toHaveBeenCalledWith({ is_active: false })
    expect(eqMock).toHaveBeenCalledWith("id", "auto-1")
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

    const { result } = renderHook(() => useToggleAutomation(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "auto-1", enabled: false })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Update failed")
  })
})
