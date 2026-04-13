/**
 * Tests for the contracts query hooks and helpers.
 *
 * Pure key-factory tests run without any mocking.
 * Hook tests use a real QueryClient + mocked Supabase client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  contractKeys,
  useContracts,
  useContract,
  useContractTemplates,
  type ContractRow,
  type ContractTemplateRow,
} from "./contracts"

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@/utils/supabase/client"

function makeChain(resolved: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  ;["select", "eq", "order", "limit", "from"].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.single = vi.fn().mockResolvedValue(resolved)
  // Make the chain itself awaitable (returns resolved when awaited without .single())
  ;(chain as { then?: unknown }).then = undefined
  // attach a resolved value directly for chained await
  Object.defineProperty(chain, "then", { get: () => undefined })
  // Let .select().order() return a promise by making the chain thenable:
  chain.__resolve = resolved
  return chain
}

function makeSupabaseMock(resolvedData: unknown, error = null) {
  const chain = makeChain({ data: resolvedData, error })
  // Make the chain thenable so `await supabase.from(...).select(...)` works
  chain.select = vi.fn().mockReturnValue({
    ...chain,
    order: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    eq: vi.fn().mockReturnValue({
      ...chain,
      single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    }),
  })
  return {
    from: vi.fn().mockReturnValue(chain),
    auth: { getUser: vi.fn() },
  }
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// 1. Key factory (pure, no mocking needed)
// ---------------------------------------------------------------------------

describe("contractKeys", () => {
  it("all returns stable base key", () => {
    expect(contractKeys.all).toEqual(["contracts"])
  })

  it("lists() scopes under all", () => {
    expect(contractKeys.lists()).toEqual(["contracts", "list"])
  })

  it("detail() includes the id", () => {
    expect(contractKeys.detail("abc-123")).toEqual(["contracts", "detail", "abc-123"])
  })

  it("templates() is distinct from lists()", () => {
    expect(contractKeys.templates()).toEqual(["contracts", "templates"])
    expect(contractKeys.templates()).not.toEqual(contractKeys.lists())
  })
})

// ---------------------------------------------------------------------------
// 2. useContracts — maps DB rows to UI Contract shape
// ---------------------------------------------------------------------------

const sampleContractRow: ContractRow = {
  id: "c1",
  title: "Design Contract",
  description: "A test contract",
  creator_id: "u1",
  template_id: null,
  status: "signed",
  total_amount: 5000,
  currency: "USD",
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
  client_id: "cl1",
  freelancer_id: "u1",
  client_email: "client@example.com",
  signed_by_client: "2026-03-03T00:00:00Z",
  signed_by_freelancer: "2026-03-02T00:00:00Z",
  tenant_id: "t1",
}

describe("useContracts", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns mapped contracts from Supabase", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [sampleContractRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useContracts(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const contracts = result.current.data!
    expect(contracts).toHaveLength(1)
    const c = contracts[0]
    expect(c.id).toBe("c1")
    expect(c.title).toBe("Design Contract")
    expect(c.status).toBe("signed")
    expect(c.numericValue).toBe(5000)
    expect(c.client).toBe("client@example.com")
    // Signed signers
    expect(c.signers[0].status).toBe("signed") // freelancer
    expect(c.signers[1].status).toBe("signed") // client
  })

  it("maps draft status correctly", async () => {
    const draftRow = { ...sampleContractRow, status: "draft" as const, signed_by_client: null, signed_by_freelancer: null }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [draftRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useContracts(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("draft")
  })

  it("maps completed DB status to expired UI status", async () => {
    const completedRow = { ...sampleContractRow, status: "completed" as const }
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [completedRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useContracts(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("expired")
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

    const { result } = renderHook(() => useContracts(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("DB error")
  })
})

// ---------------------------------------------------------------------------
// 3. useContract (single record)
// ---------------------------------------------------------------------------

describe("useContract", () => {
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

    const { result } = renderHook(() => useContract(""), {
      wrapper: wrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe("idle")
  })

  it("fetches a single contract by id", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: sampleContractRow, error: null }),
          }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useContract("c1"), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.id).toBe("c1")
  })
})

// ---------------------------------------------------------------------------
// 4. useContractTemplates
// ---------------------------------------------------------------------------

const sampleTemplateRow: ContractTemplateRow = {
  id: "t1",
  name: "MSA Template",
  description: "Standard master services agreement",
  content: {},
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
}

describe("useContractTemplates", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns mapped templates", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [sampleTemplateRow], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useContractTemplates(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const templates = result.current.data!
    expect(templates).toHaveLength(1)
    expect(templates[0].id).toBe("t1")
    expect(templates[0].name).toBe("MSA Template")
    expect(templates[0].description).toBe("Standard master services agreement")
  })
})
