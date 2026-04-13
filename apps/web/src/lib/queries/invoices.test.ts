/**
 * Tests for the invoices query hooks and helpers.
 *
 * Invoices are modelled on top of `contract_payments`. These tests verify
 * the key factory, the payment-status mapper, and the row-to-Invoice mapper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  invoiceKeys,
  useInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
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

// ---------------------------------------------------------------------------
// 3. useInvoice (single record)
// ---------------------------------------------------------------------------

describe("useInvoice", () => {
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

    const { result } = renderHook(() => useInvoice(""), {
      wrapper: wrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe("idle")
  })

  it("fetches a single invoice by id", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: samplePaymentRow, error: null }),
          }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useInvoice("pay-1"), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.id).toBe("pay-1")
    expect(result.current.data!.numericAmount).toBe(2500)
  })

  it("throws when Supabase returns an error", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useInvoice("pay-missing"), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Not found")
  })
})

// ---------------------------------------------------------------------------
// 4. useCreateInvoice — mutation
// ---------------------------------------------------------------------------

describe("useCreateInvoice", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("inserts a payment row with pending status", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: samplePaymentRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ contractId: "c1", amount: 2500 })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        contract_id: "c1",
        amount: 2500,
        status: "pending",
        payment_type: "escrow",
      }),
    ])
  })

  it("throws when not authenticated", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ contractId: "c1", amount: 100 })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Not authenticated")
  })
})

// ---------------------------------------------------------------------------
// 5. useUpdateInvoice — mutation
// ---------------------------------------------------------------------------

describe("useUpdateInvoice", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("updates status on the payment row", async () => {
    const updatedRow = { ...samplePaymentRow, status: "completed" as const }
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateInvoice(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "pay-1", status: "completed" })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }))
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

    const { result } = renderHook(() => useUpdateInvoice(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: "pay-1", status: "failed" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Update error")
  })
})

// ---------------------------------------------------------------------------
// 6. useDeleteInvoice — mutation
// ---------------------------------------------------------------------------

describe("useDeleteInvoice", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("deletes the payment row by id", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("pay-1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith("id", "pay-1")
  })

  it("throws when Supabase delete fails", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate("pay-1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Delete failed")
  })
})
