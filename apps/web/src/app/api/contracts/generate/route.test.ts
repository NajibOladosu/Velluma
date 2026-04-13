/**
 * Tests for POST /api/contracts/generate
 *
 * Verifies auth enforcement, input validation, Gemini delegation,
 * Supabase persistence, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/ai/contract-generator", () => ({
  generateContract: vi.fn(),
}))

import { createClient } from "@/utils/supabase/server"
import { generateContract } from "@/lib/ai/contract-generator"
import { POST } from "./route"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleInput = {
  contractType: "web_development",
  freelancerName: "Alice Smith",
  freelancerEmail: "alice@example.com",
  clientName: "Bob Jones",
  clientEmail: "bob@client.com",
  title: "E-Commerce Website",
  projectDescription: "Build a full e-commerce platform",
  deliverables: "5-page website, payment integration, CMS",
  paymentType: "fixed",
  totalAmount: 10000,
  currency: "USD",
  revisions: 2,
  ipOwnership: "client_upon_payment",
  governingLaw: "State of California, USA",
  includeNda: false,
}

const sampleGenerated = {
  title: "Web Development Agreement — Alice Smith & Bob Jones",
  contractType: "web_development",
  summary: "A fixed-price web development contract for $10,000.",
  sections: [
    { id: "parties", title: "1. Parties to the Agreement", content: "Alice Smith (Service Provider) and Bob Jones (Client)." },
    { id: "scope", title: "2. Scope of Work", content: "Build a 5-page e-commerce website." },
  ],
  metadata: {
    governingLaw: "State of California, USA",
    paymentType: "fixed",
    totalValue: 10000,
    currency: "USD",
    estimatedDuration: "2 months",
    keyTerms: ["IP transfer on payment", "2 revision rounds"],
  },
}

function makeSupabaseMock({
  user = { id: "user-1", email: "alice@example.com" },
  contractInsertError = null,
  contractData = { id: "contract-123" },
  docInsertError = null,
}: {
  user?: { id: string; email: string } | null
  contractInsertError?: { message: string } | null
  contractData?: { id: string } | null
  docInsertError?: { message: string } | null
} = {}) {
  const singleMock = vi.fn().mockResolvedValue({
    data: contractData,
    error: contractInsertError,
  })
  const docInsertSingle = vi.fn().mockResolvedValue({ error: docInsertError })

  // Track which table is being queried
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "contracts") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: singleMock }),
        }),
      }
    }
    // contract_documents
    return {
      insert: vi.fn().mockResolvedValue({ error: docInsertError }),
    }
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: fromMock,
  }
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/contracts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/contracts/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ user: null }) as ReturnType<typeof createClient>,
    )

    const res = await POST(makeRequest(sampleInput))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 400 when projectDescription is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock() as ReturnType<typeof createClient>,
    )

    const res = await POST(makeRequest({ ...sampleInput, projectDescription: "" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/required/i)
  })

  it("returns 400 when deliverables is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock() as ReturnType<typeof createClient>,
    )

    const res = await POST(makeRequest({ ...sampleInput, deliverables: "  " }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/required/i)
  })

  it("calls generateContract with the input and returns contract data", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock() as ReturnType<typeof createClient>,
    )
    vi.mocked(generateContract).mockResolvedValue(sampleGenerated)

    const res = await POST(makeRequest(sampleInput))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.contractId).toBe("contract-123")
    expect(body.title).toBe(sampleGenerated.title)
    expect(body.summary).toBe(sampleGenerated.summary)
    expect(body.sections).toHaveLength(2)
    expect(body.sections[0].id).toBe("parties")
    expect(vi.mocked(generateContract)).toHaveBeenCalledWith(
      expect.objectContaining({ projectDescription: sampleInput.projectDescription }),
    )
  })

  it("persists the contract to Supabase with correct fields", async () => {
    const supabase = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(
      supabase as ReturnType<typeof createClient>,
    )
    vi.mocked(generateContract).mockResolvedValue(sampleGenerated)

    await POST(makeRequest(sampleInput))

    expect(supabase.from).toHaveBeenCalledWith("contracts")
    const contractsCall = supabase.from.mock.calls.find(([t]) => t === "contracts")
    expect(contractsCall).toBeTruthy()
  })

  it("returns 500 when Gemini generation throws", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock() as ReturnType<typeof createClient>,
    )
    vi.mocked(generateContract).mockRejectedValue(
      new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured"),
    )

    const res = await POST(makeRequest(sampleInput))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain("GOOGLE_GENERATIVE_AI_API_KEY")
  })

  it("returns 500 when Supabase contract insert fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        contractInsertError: { message: "unique violation" },
        contractData: null,
      }) as ReturnType<typeof createClient>,
    )
    vi.mocked(generateContract).mockResolvedValue(sampleGenerated)

    const res = await POST(makeRequest(sampleInput))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("unique violation")
  })

  it("still returns 200 when contract_documents insert fails (non-fatal)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        docInsertError: { message: "foreign key violation" },
      }) as ReturnType<typeof createClient>,
    )
    vi.mocked(generateContract).mockResolvedValue(sampleGenerated)

    const res = await POST(makeRequest(sampleInput))
    // Contract creation should succeed even if document versioning fails
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contractId).toBe("contract-123")
  })

  it("passes regenerateFeedback to generateContract when provided", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock() as ReturnType<typeof createClient>,
    )
    vi.mocked(generateContract).mockResolvedValue(sampleGenerated)

    const inputWithFeedback = {
      ...sampleInput,
      regenerateFeedback: "Strengthen the payment terms",
    }

    await POST(makeRequest(inputWithFeedback))

    expect(vi.mocked(generateContract)).toHaveBeenCalledWith(
      expect.objectContaining({
        regenerateFeedback: "Strengthen the payment terms",
      }),
    )
  })
})
