/**
 * Tests for the AI contract generator.
 *
 * Mocks the Google Generative AI SDK so no real API calls are made.
 * Tests cover: prompt building correctness, JSON parsing, code-fence stripping,
 * error handling, and regeneration feedback injection.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ContractGenerationInput } from "./contract-generator"

// ---------------------------------------------------------------------------
// Mock @google/generative-ai
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.fn()

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}))

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const validInput: ContractGenerationInput = {
  contractType: "web_development",
  freelancerName: "Alice Smith",
  freelancerEmail: "alice@studio.com",
  clientName: "Bob Jones",
  clientEmail: "bob@client.com",
  clientCompany: "Acme Corp",
  title: "E-Commerce Website Development",
  projectDescription: "Build a modern e-commerce platform with Stripe integration.",
  deliverables: "5-page website, Stripe checkout, CMS, mobile-responsive design",
  exclusions: "Hosting, copywriting, stock photos",
  paymentType: "fixed",
  totalAmount: 10000,
  currency: "USD",
  paymentSchedule: "50% upfront, 50% on delivery",
  startDate: "2026-05-01",
  endDate: "2026-07-31",
  revisions: 3,
  ipOwnership: "client_upon_payment",
  governingLaw: "State of California, USA",
  includeNda: true,
  additionalNotes: "Add a 30-day post-launch support clause",
}

const validGeneratedJson = {
  title: "Web Development Agreement — Alice Smith & Acme Corp",
  contractType: "web_development",
  summary: "A $10,000 fixed-price web development contract between Alice Smith and Acme Corp.",
  sections: [
    {
      id: "parties",
      title: "1. Parties to the Agreement",
      content: "Alice Smith (Service Provider) and Acme Corp (Client) enter this agreement.",
    },
    {
      id: "scope",
      title: "2. Scope of Work and Deliverables",
      content: "The Service Provider will build a 5-page website with Stripe checkout.",
    },
    {
      id: "payment",
      title: "4. Compensation and Payment Terms",
      content: "Total fee: $10,000 USD. 50% due on signing, 50% on delivery.",
    },
  ],
  metadata: {
    governingLaw: "State of California, USA",
    paymentType: "fixed",
    totalValue: 10000,
    currency: "USD",
    estimatedDuration: "3 months",
    keyTerms: ["IP transfer on payment", "3 revision rounds", "NDA included"],
  },
}

function mockGeminiSuccess(response = validGeneratedJson) {
  mockGenerateContent.mockResolvedValue({
    response: { text: () => JSON.stringify(response) },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateContract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-123"
  })

  it("throws when GOOGLE_GENERATIVE_AI_API_KEY is not set", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    const { generateContract } = await import("./contract-generator")
    await expect(generateContract(validInput)).rejects.toThrow(
      "GOOGLE_GENERATIVE_AI_API_KEY",
    )
  })

  it("returns a structured GeneratedContract on success", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    const result = await generateContract(validInput)

    expect(result.title).toBe(validGeneratedJson.title)
    expect(result.summary).toBe(validGeneratedJson.summary)
    expect(result.sections).toHaveLength(3)
    expect(result.sections[0].id).toBe("parties")
    expect(result.metadata.totalValue).toBe(10000)
    expect(result.metadata.keyTerms).toContain("NDA included")
  })

  it("strips markdown code fences from Gemini response", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => `\`\`\`json\n${JSON.stringify(validGeneratedJson)}\n\`\`\``,
      },
    })
    const { generateContract } = await import("./contract-generator")

    const result = await generateContract(validInput)
    expect(result.title).toBe(validGeneratedJson.title)
  })

  it("strips bare code fences (no language tag)", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => `\`\`\`\n${JSON.stringify(validGeneratedJson)}\n\`\`\``,
      },
    })
    const { generateContract } = await import("./contract-generator")

    const result = await generateContract(validInput)
    expect(result.sections).toHaveLength(3)
  })

  it("throws when Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "This is not JSON at all." },
    })
    const { generateContract } = await import("./contract-generator")

    await expect(generateContract(validInput)).rejects.toThrow()
  })

  it("throws when Gemini returns JSON without sections", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify({ title: "Test", sections: [] }) },
    })
    const { generateContract } = await import("./contract-generator")

    await expect(generateContract(validInput)).rejects.toThrow(
      /missing sections/i,
    )
  })

  it("includes regenerateFeedback in the prompt when provided", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    const inputWithFeedback: ContractGenerationInput = {
      ...validInput,
      regenerateFeedback: "Make the termination clause more freelancer-friendly",
    }

    await generateContract(inputWithFeedback)

    const calledWith = mockGenerateContent.mock.calls[0][0] as string
    expect(calledWith).toContain("Make the termination clause more freelancer-friendly")
    expect(calledWith).toContain("REVISION INSTRUCTIONS")
  })

  it("includes client name, email, and amount in the prompt", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    await generateContract(validInput)

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain("Bob Jones")
    expect(prompt).toContain("bob@client.com")
    expect(prompt).toContain("Acme Corp")
    expect(prompt).toContain("10,000")
  })

  it("includes exclusions in the prompt when provided", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    await generateContract(validInput)

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain("Hosting, copywriting, stock photos")
    expect(prompt).toContain("EXPLICITLY EXCLUDED")
  })

  it("includes NDA instruction when includeNda is true", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    await generateContract({ ...validInput, includeNda: true })

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain("Full mutual NDA required")
  })

  it("uses 'Standard confidentiality' when includeNda is false", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    await generateContract({ ...validInput, includeNda: false })

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain("Standard confidentiality")
  })

  it("formats hourly payment correctly in the prompt", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    const hourlyInput: ContractGenerationInput = {
      ...validInput,
      paymentType: "hourly",
      hourlyRate: 150,
      totalAmount: undefined,
    }

    await generateContract(hourlyInput)

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain("150")
    expect(prompt).toContain("Hourly Rate")
  })

  it("includes additionalNotes in the prompt", async () => {
    mockGeminiSuccess()
    const { generateContract } = await import("./contract-generator")

    await generateContract(validInput)

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain("30-day post-launch support clause")
  })
})

// ---------------------------------------------------------------------------
// CONTRACT_TYPE_LABELS
// ---------------------------------------------------------------------------

describe("CONTRACT_TYPE_LABELS", () => {
  it("covers all 12 contract types", async () => {
    const { CONTRACT_TYPE_LABELS } = await import("./contract-generator")
    const keys = Object.keys(CONTRACT_TYPE_LABELS)
    expect(keys).toHaveLength(12)
    expect(keys).toContain("web_development")
    expect(keys).toContain("nda")
    expect(keys).toContain("retainer")
    expect(keys).toContain("general_freelance")
  })

  it("all labels are non-empty strings", async () => {
    const { CONTRACT_TYPE_LABELS } = await import("./contract-generator")
    for (const [key, label] of Object.entries(CONTRACT_TYPE_LABELS)) {
      expect(typeof label).toBe("string")
      expect(label.length).toBeGreaterThan(0)
      expect(label).not.toContain("undefined")
    }
  })
})
