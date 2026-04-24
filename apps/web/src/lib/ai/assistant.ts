/**
 * AI assistant helpers — proposal copilot & contract review.
 * Server-side only. Shared Gemini client wrapper.
 */
import { GoogleGenerativeAI } from "@google/generative-ai"

function getModel(opts?: { temperature?: number; model?: string }) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.")
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: opts?.model ?? "gemini-2.5-flash",
    generationConfig: {
      temperature: opts?.temperature ?? 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  })
}

export interface ProposalDraftInput {
  clientName: string
  projectTitle: string
  scope: string
  budget?: number
  currency?: string
  timelineWeeks?: number
  tone?: "professional" | "friendly" | "concise"
}

export interface ProposalDraft {
  executiveSummary: string
  scope: string
  deliverables: string[]
  timeline: string
  pricing: string
  terms: string
}

export async function draftProposal(input: ProposalDraftInput): Promise<ProposalDraft> {
  const model = getModel({ temperature: 0.5 })
  const prompt = `
You are a freelancer's proposal copilot. Draft a concise, client-ready proposal
based on the input below. Respond with pure JSON only — no markdown fences,
no commentary.

Input:
- Client: ${input.clientName}
- Project: ${input.projectTitle}
- Scope notes: ${input.scope}
- Budget: ${input.budget != null ? `${input.currency ?? "USD"} ${input.budget}` : "not specified"}
- Timeline: ${input.timelineWeeks != null ? `${input.timelineWeeks} weeks` : "not specified"}
- Tone: ${input.tone ?? "professional"}

Return JSON matching exactly:
{
  "executiveSummary": "2-3 sentences framing the engagement",
  "scope": "bulleted in/out of scope, as a single markdown string",
  "deliverables": ["concrete deliverable 1", "deliverable 2", "..."],
  "timeline": "phases with rough dates or week markers",
  "pricing": "how pricing is structured (fixed/hourly/milestones) in plain English",
  "terms": "payment terms, revisions, cancellation in 2-3 sentences"
}
  `.trim()

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
  return parseJson<ProposalDraft>(raw)
}

export interface ContractReviewInput {
  contractText: string
  perspective?: "freelancer" | "client"
}

export interface ContractIssue {
  clause: string
  severity: "low" | "medium" | "high"
  concern: string
  suggestion: string
}

export interface ContractReview {
  summary: string
  missingClauses: string[]
  issues: ContractIssue[]
  overallRisk: "low" | "medium" | "high"
}

export async function reviewContract(input: ContractReviewInput): Promise<ContractReview> {
  const model = getModel({ temperature: 0.2 })
  const truncated = input.contractText.length > 12000
    ? input.contractText.slice(0, 12000) + "\n\n[truncated]"
    : input.contractText

  const prompt = `
You are an experienced freelance contract reviewer. Review the contract below
from the perspective of a ${input.perspective ?? "freelancer"}. Flag missing
standard clauses (IP assignment, kill fee, scope creep, late-payment, indemnity
caps, termination, jurisdiction), vague or risky language, and one-sided terms.

Respond with pure JSON only — no markdown fences, no commentary.

Contract:
---
${truncated}
---

Return JSON matching exactly:
{
  "summary": "1-2 paragraph plain-English overview of the agreement",
  "missingClauses": ["name of each missing standard clause"],
  "issues": [
    { "clause": "short quote or name of clause", "severity": "low|medium|high",
      "concern": "why this is a problem", "suggestion": "how to fix/negotiate" }
  ],
  "overallRisk": "low|medium|high"
}
  `.trim()

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
  return parseJson<ContractReview>(raw)
}

function parseJson<T>(raw: string): T {
  let text = raw
  // Strip code fences if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1]
  return JSON.parse(text) as T
}
