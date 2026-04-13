/**
 * Tests for the invoices query hooks and helpers.
 *
 * Invoices are modelled on top of `contract_payments`. These tests verify
 * the key factory, the payment-status mapper, and the row-to-Invoice mapper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  invoiceKeys,
  useInvoices,
  type Invoice,
} from "./invoices"

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
        order: vi.fn().mockResolvedValue({ data: resolvedData, error }),
      }),
    }),
    auth: { getUser: vi.fn() },
  }
}

// ---------------------------------------------------------------------------
// Sample DB rows
// ---------------------------------------------------------------------------

const samplePaymentRow = {
  id: "pay-1",
  contract_id: "c1",
  user_id: "u1",
  amount: 2500,
  currency: "USD",
  payment_type: "escrow" as const,
  status: "completed" as const,
  created_at: "2026-03-01T00:00:00Z",
  completed_at: "2026-03-05T00:00:00Z",
  contracts: { title: "Design Contract", client_email: "client@example.com" },
}

// ---------------------------------------------------------------------------
// 1. Key factory
// ---------------------------------------------------------------------------

describe("invoiceKeys", () => {
  it("all returns stable base key", () => {
    expect(invoiceKeys.all).toEqual(["invoices"])
  })

  it("lists() scopes under all", () => {
    expect(invoiceKeys.lists()).toEqual(["invoices", "list"])
  })

  it("detail() includes the id", () => {
    expect(invoiceKeys.detail("pay-1")).toEqual(["invoices", "detail", "pay-1"])
  })

  it("lists() is distinct from detail()", () => {
    expect(invoiceKeys.lists()).not.toEqual(invoiceKeys.detail("x"))
  })
})

// ---------------------------------------------------------------------------
// 2. useInvoices — maps DB rows to UI Invoice shape
// ---------------------------------------------------------------------------

describe("useInvoices", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns mapped invoices from Supabase", async () => {
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([samplePaymentRow]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const invoices = result.current.data!
    expect(invoices).toHaveLength(1)
    const inv = invoices[0]
    expect(inv.id).toBe("pay-1")
    expect(inv.number).toBe("INV-0001")
    expect(inv.client).toBe("client@example.com")
    expect(inv.numericAmount).toBe(2500)
    expect(inv.contractId).toBe("c1")
    expect(inv.contractTitle).toBe("Design Contract")
  })

  it("maps completed status to paid", async () => {
    const row = { ...samplePaymentRow, status: "completed" as const }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("paid")
  })

  it("maps release payment_type to paid", async () => {
    const row = { ...samplePaymentRow, status: "pending" as const, payment_type: "release" as const }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("paid")
  })

  it("maps failed status to overdue", async () => {
    const row = { ...samplePaymentRow, status: "failed" as const }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("overdue")
  })

  it("maps pending status to processing", async () => {
    const row = { ...samplePaymentRow, status: "pending" as const, payment_type: "escrow" as const }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe("processing")
  })

  it("uses 'Unknown' client when contracts is null", async () => {
    const row = { ...samplePaymentRow, contracts: null }
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock([row]) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].client).toBe("Unknown")
  })

  it("generates sequential invoice numbers", async () => {
    const rows = [
      { ...samplePaymentRow, id: "p1" },
      { ...samplePaymentRow, id: "p2" },
      { ...samplePaymentRow, id: "p3" },
    ]
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock(rows) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const numbers = result.current.data!.map((i) => i.number)
    expect(numbers).toEqual(["INV-0001", "INV-0002", "INV-0003"])
  })

  it("throws when Supabase returns an error", async () => {
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock(null, { message: "DB error" }) as ReturnType<typeof createClient>
    )

    const { result } = renderHook(() => useInvoices(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("DB error")
  })
})
