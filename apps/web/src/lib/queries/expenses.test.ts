/**
 * Tests for the expenses query hooks and helpers.
 *
 * Covers the key factory, useExpenses, useExpenseSummary, and the
 * exported formatter functions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  expenseKeys,
  useExpenses,
  useExpenseSummary,
  formatExpenseCurrency,
  formatExpenseDate,
  type ExpenseRow,
} from "./expenses"

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
// Sample DB rows
// ---------------------------------------------------------------------------

const sampleExpense: ExpenseRow = {
  id: "exp-1",
  project_id: "p1",
  tenant_id: "t1",
  user_id: "u1",
  description: "Adobe CC Subscription",
  amount: 55,
  currency: "USD",
  category: "Software",
  expense_date: "2026-03-10",
  receipt_url: null,
  notes: null,
  status: "approved",
  created_at: "2026-03-10T10:00:00Z",
}

const pendingExpense: ExpenseRow = {
  ...sampleExpense,
  id: "exp-2",
  description: "Office Supplies",
  amount: 120,
  status: "pending",
}

// ---------------------------------------------------------------------------
// 1. Key factory
// ---------------------------------------------------------------------------

describe("expenseKeys", () => {
  it("all returns stable base key", () => {
    expect(expenseKeys.all).toEqual(["expenses"])
  })

  it("lists() scopes under all", () => {
    expect(expenseKeys.lists()).toEqual(["expenses", "list"])
  })

  it("summary() is distinct from lists()", () => {
    expect(expenseKeys.summary()).toEqual(["expenses", "summary"])
    expect(expenseKeys.summary()).not.toEqual(expenseKeys.lists())
  })
})

// ---------------------------------------------------------------------------
// 2. Formatter helpers
// ---------------------------------------------------------------------------

describe("formatExpenseCurrency", () => {
  it("formats USD amounts", () => {
    expect(formatExpenseCurrency(1234.56, "USD")).toBe("$1,234.56")
  })

  it("formats zero correctly", () => {
    expect(formatExpenseCurrency(0, "USD")).toBe("$0.00")
  })
})

describe("formatExpenseDate", () => {
  it("formats ISO date string to locale date", () => {
    const result = formatExpenseDate("2026-03-10")
    expect(result).toContain("2026")
  })
})

// ---------------------------------------------------------------------------
// 3. useExpenses
// ---------------------------------------------------------------------------

describe("useExpenses", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("returns raw expense rows from Supabase", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [sampleExpense], error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useExpenses(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const expenses = result.current.data!
    expect(expenses).toHaveLength(1)
    expect(expenses[0].id).toBe("exp-1")
    expect(expenses[0].description).toBe("Adobe CC Subscription")
    expect(expenses[0].amount).toBe(55)
    expect(expenses[0].category).toBe("Software")
    expect(expenses[0].status).toBe("approved")
  })

  it("returns empty array when no data", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useExpenses(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
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

    const { result } = renderHook(() => useExpenses(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("DB error")
  })
})

// ---------------------------------------------------------------------------
// 4. useExpenseSummary
// ---------------------------------------------------------------------------

describe("useExpenseSummary", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it("computes billed total from approved expenses", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [sampleExpense, pendingExpense],
          error: null,
        }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useExpenseSummary(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const summary = result.current.data!
    expect(summary.totalBilled).toBe(55)     // only approved
    expect(summary.totalReimbursable).toBe(120) // only pending
    expect(summary.totalPending).toBe(1)
    expect(summary.formattedBilled).toBe("$55.00")
    expect(summary.formattedReimbursable).toBe("$120.00")
  })

  it("returns zeros when no expenses exist", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useExpenseSummary(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.totalBilled).toBe(0)
    expect(result.current.data!.totalReimbursable).toBe(0)
    expect(result.current.data!.totalPending).toBe(0)
  })

  it("throws when Supabase returns an error", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: "Summary error" } }),
      }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useExpenseSummary(), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe("Summary error")
  })
})
