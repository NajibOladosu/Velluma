/**
 * Tests for the proposals query hooks and helpers.
 *
 * Proposals are stored in the `projects` table. Tests verify the key factory,
 * status mapping, metadata extraction, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  proposalKeys,
  useProposals,
  useProposal,
  useDeleteProposal,
  type ProjectRow,
} from "./proposals"

// ---------------------------------------------------------------------------
// Mock Supabase client and API client
// ---------------------------------------------------------------------------

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { createClient } from "@/utils/supabase/client"
import { api } from "@/lib/api-client"

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Sample DB rows
// ---------------------------------------------------------------------------

const sampleProjectRow: ProjectRow = {
  id: "proj-1",
  tenant_id: "t1",
  user_id: "u1",
  client_id: "cl1",
  title: "Website Redesign Proposal",
  description: "Full site overhaul",
  status: "sent",
  total_budget: 8000,
  metadata: {
    sent_at: "2026-03-05T00:00:00Z",
    viewed_at: "2026-03-06T00:00:00Z",
    signed_at: null,
    expires_at: "2026-04-05T00:00:00Z",
    view_count: 3,
    section_count: 5,
    template: "MSA",
  },
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-06T00:00:00Z",
  crm_clients: { name: "Acme Corp", email: "acme@example.com" },
}

// ---------------------------------------------------------------------------
// 1. Key factory
// ---------------------------------------------------------------------------

describe("proposalKeys", () => {
  it("all returns stable base key", () => {
    expect(proposalKeys.all).toEqual(["proposals"])
  })

  it("lists() scopes under all", () => {
    expect(proposalKeys.lists()).toEqual(["proposals", "list"])
  })

  it("detail() includes the id", () => {
    expect(proposalKeys.detail("proj-1")).toEqual(["proposals", "detail", "proj-1"])
  })

  it("lists() is distinct from detail()", () => {
    expect(proposalKeys.lists()).not.toEqual(proposalKeys.detail("x"))
  })
})

// ---------------------------------------------------------------------------
// 2. useProposals — maps DB rows to UI Proposal shape
// ---------------------------------------------------------------------------

describe("useProposals", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns mapped proposals from Supabase", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [sampleProjectRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const proposals = result.current.data!
    expect(proposals).toHaveLength(1)
    const p = proposals[0]
    expect(p.id).toBe("proj-1")
    expect(p.title).toBe("Website Redesign Proposal")
    expect(p.client).toBe("Acme Corp")
    expect(p.clientId).toBe("cl1")
    expect(p.numericValue).toBe(8000)
    expect(p.viewCount).toBe(3)
    expect(p.sections).toBe(5)
    expect(p.template).toBe("MSA")
  })

  it("maps 'sent' status correctly", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [sampleProjectRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("sent")
  })

  it("maps 'completed' DB status to 'signed'", async () => {
    const row = { ...sampleProjectRow, status: "completed" }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("signed")
  })

  it("maps 'cancelled' DB status to 'expired'", async () => {
    const row = { ...sampleProjectRow, status: "cancelled" }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("expired")
  })

  it("falls back to 'draft' for unknown status", async () => {
    const row = { ...sampleProjectRow, status: "unknown_status" }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("draft")
  })

  it("uses client email as fallback when name is null", async () => {
    const row = { ...sampleProjectRow, crm_clients: { name: null as unknown as string, email: "fallback@example.com" } }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].client).toBe("fallback@example.com")
  })

  it("uses '—' for value when budget is null", async () => {
    const row = { ...sampleProjectRow, total_budget: null }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].value).toBe("—")
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

    const { result } = renderHook(() => useProposals(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("DB error")
  })
})

// ---------------------------------------------------------------------------
// 3. useProposal (single record)
// ---------------------------------------------------------------------------

describe("useProposal", () => {
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

    const { result } = renderHook(() => useProposal(""), {
      wrapper: wrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe("idle")
  })

  it("fetches a single proposal by id", async () => {
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

    const { result } = renderHook(() => useProposal("proj-1"), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.id).toBe("proj-1")
    expect(result.current.data!.title).toBe("Website Redesign Proposal")
  })
})

// ---------------------------------------------------------------------------
// 4. useDeleteProposal — mutation
// ---------------------------------------------------------------------------

describe("useDeleteProposal", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("calls supabase delete with the proposal id", async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: mockDelete }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteProposal(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("proj-1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDelete).toHaveBeenCalled()
  })

  it("throws when Supabase returns an error", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "DB delete error" } }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteProposal(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("proj-1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("DB delete error")
  })
})
