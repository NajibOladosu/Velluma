/**
 * Server-side AI contract generation via Google Gemini 2.0 Flash.
 *
 * This module is ONLY imported from Next.js API routes (server-side).
 * Never import it from client components — the API key lives server-side.
 */
import { GoogleGenerativeAI } from "@google/generative-ai"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContractType =
  | "web_development"
  | "software_development"
  | "design_services"
  | "content_creation"
  | "consulting"
  | "photography_video"
  | "marketing_services"
  | "mobile_app"
  | "nda"
  | "retainer"
  | "master_services"
  | "general_freelance"

export interface ContractGenerationInput {
  // Parties
  contractType: ContractType
  freelancerName: string
  freelancerEmail: string
  clientName: string
  clientEmail: string
  clientCompany?: string
  // Scope
  title: string
  projectDescription: string
  deliverables: string
  exclusions?: string
  // Commercial
  paymentType: "fixed" | "milestone" | "hourly"
  totalAmount?: number
  hourlyRate?: number
  currency: string
  paymentSchedule?: string
  startDate?: string
  endDate?: string
  // Legal preferences
  revisions: number
  ipOwnership: "client_upon_payment" | "freelancer" | "shared"
  governingLaw: string
  includeNda: boolean
  additionalNotes?: string
  // Regeneration feedback
  regenerateFeedback?: string
}

export interface ContractSection {
  id: string
  title: string
  content: string
}

export interface GeneratedContract {
  title: string
  contractType: ContractType
  summary: string
  sections: ContractSection[]
  metadata: {
    governingLaw: string
    paymentType: string
    totalValue: number
    currency: string
    estimatedDuration: string
    keyTerms: string[]
  }
}

// ---------------------------------------------------------------------------
// Contract type labels
// ---------------------------------------------------------------------------

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  web_development: "Web Development Agreement",
  software_development: "Software Development Contract",
  design_services: "Design Services Agreement",
  content_creation: "Content Creation Agreement",
  consulting: "Consulting Agreement",
  photography_video: "Photography & Videography Agreement",
  marketing_services: "Marketing Services Agreement",
  mobile_app: "Mobile App Development Contract",
  nda: "Non-Disclosure Agreement",
  retainer: "Retainer Agreement",
  master_services: "Master Services Agreement",
  general_freelance: "Freelance Services Agreement",
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You are ContractAI — Velluma's expert contract drafting engine. You generate complete, legally-sound, professionally balanced agreements for independent contractors and their clients.

Your contracts are used in real business transactions. They must be:
• COMPLETE — Every section fully written. No "[INSERT]", no "as agreed", no blank placeholders.
• SPECIFIC — Use exact names, amounts, dates, and deliverables from the input verbatim.
• BALANCED — Protect both parties fairly. Never one-sided.
• PLAIN LANGUAGE — Understandable by non-lawyers, yet legally precise.
• PROFESSIONAL — Fortune 500 legal quality. Every clause is enforceable.

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON matching this exact schema. No markdown. No code fences. No explanation outside the JSON.

{
  "title": "Full descriptive contract title using real party names",
  "contractType": "the_type_slug",
  "summary": "One sentence: what this contract covers, between whom, and for how much",
  "sections": [
    {
      "id": "kebab-slug",
      "title": "N. Section Title",
      "content": "Full section text. Paragraphs separated by \\n\\n. Sub-items use (a), (b), (c) format. Reference specific names and dollar amounts throughout."
    }
  ],
  "metadata": {
    "governingLaw": "State/Country",
    "paymentType": "fixed|milestone|hourly",
    "totalValue": 0,
    "currency": "USD",
    "estimatedDuration": "X weeks/months",
    "keyTerms": ["key protection 1", "key protection 2", "key protection 3"]
  }
}

━━━ MANDATORY SECTIONS ━━━
Include ALL of the following. Adapt content to the contract type:

1. Parties to the Agreement
   — Full identifying info for Service Provider and Client
   — Define "Service Provider" and "Client" as used throughout
   — Effective date of the agreement

2. Scope of Work and Deliverables
   — Explicit numbered list of what IS included
   — Explicit list of what is NOT included (scope protection)
   — Acceptance criteria for each major deliverable
   — Client's obligation to provide timely feedback and materials

3. Project Timeline and Milestones
   — Start date and final delivery date
   — Key milestone dates
   — Approval window: Client has [N] business days to approve or provide written feedback
   — Deemed acceptance clause (silence = approval after approval window)

4. Compensation and Payment Terms
   — Total contract value or applicable rate
   — Exact payment schedule (percentages tied to specific milestones)
   — Invoice submission process and payment due date (Net 15 or as specified)
   — Late payment penalty: 1.5% per month on outstanding balances
   — Expense reimbursement policy
   — No work stoppage without prior written notice, but Service Provider may pause after 14 days of non-payment

5. Intellectual Property Rights
   — Ownership of final deliverables (conditioned on full payment)
   — Service Provider retains all rights until final payment received
   — Pre-existing IP carve-out: Service Provider's tools, frameworks, and proprietary methods remain Service Provider's property
   — Client receives perpetual license to use pre-existing IP embedded in deliverables
   — Third-party licensed components disclosed and their license terms noted
   — Service Provider's right to display work in portfolio (Client may request anonymization)

6. Confidentiality and Non-Disclosure
   — Definition of Confidential Information (broad, practical definition)
   — Both parties' obligations to protect confidential information
   — Standard exceptions: publicly available, independently developed, required by law
   — Duration: obligations survive termination for 2 years
   — Return or destruction of materials upon termination

7. Revision and Change Request Policy
   — Number of revision rounds included at no additional charge
   — Definition: a "revision" is refinement within original scope; a "new feature" is a change in scope
   — Process for requesting revisions (written, via agreed channel)
   — Additional revision rate: $[rate] per hour or $[rate] per revision round
   — Change orders for scope additions must be signed by both parties before work begins

8. Warranties and Representations
   — Service Provider: work will be original, not infringe third-party IP, performed professionally
   — Client: has authority to enter this agreement, will provide timely materials, will not reverse-engineer
   — Mutual: legal capacity to contract, no conflicting obligations

9. Limitation of Liability
   — Service Provider's aggregate liability capped at total fees paid under this agreement
   — Neither party liable for indirect, consequential, or punitive damages
   — Carve-out: obligations of confidentiality and IP indemnification are not subject to this cap

10. Termination and Cancellation
    — Termination for convenience: either party may terminate with [N] days written notice
    — Cancellation fee: Client pays for all work completed plus [X]% of remaining contract value as kill fee
    — Termination for cause: material breach, non-payment after 14 days notice, insolvency
    — Upon termination: Client receives completed work only after payment in full; both parties return materials

11. Dispute Resolution
    — Good-faith negotiation: parties attempt resolution within 30 days of written notice
    — Mediation: if unresolved, non-binding mediation before formal proceedings
    — Jurisdiction for formal dispute resolution

12. Governing Law and Jurisdiction
    — Applicable law (state/country from input)
    — Venue for any legal proceedings

13. General Provisions
    — Entire Agreement (integration clause)
    — Severability
    — No Waiver
    — Amendment: changes require written agreement signed by both parties
    — Force Majeure: neither party liable for delays caused by events outside reasonable control
    — Independent Contractor: Service Provider is not an employee; no benefits, withholding, or agency relationship
    — No Assignment without prior written consent
    — Counterparts and Electronic Signatures: legally valid

━━━ CONTRACT-TYPE SPECIFIC ADDITIONS ━━━

web_development / software_development / mobile_app:
  Add "Technical Specifications and Stack" section: agreed technologies, browser/device compatibility, performance benchmarks (load time, uptime SLA if applicable), code quality standards (documentation, commenting)
  Add "Deployment and Handover" section: who handles deployment, credential/access handover process, post-launch bug-fix warranty period (specify exact days, e.g., 30 days), what qualifies as a bug vs. enhancement

design_services:
  Add "Deliverable Formats and Assets" section: source files (Figma, AI, PSD), export formats, font licensing responsibilities, stock image rights and usage limits, brand asset ownership

content_creation:
  Add "Publication Rights and Attribution" section: exclusivity period (if any), geographic scope, right to adapt/modify/translate, attribution requirements, moral rights waiver or assertion

consulting:
  Add "Engagement Structure" section: monthly hours allocated, meeting cadence and format, key contacts and escalation path, deliverable format (reports, recommendations, presentations)

nda:
  Replace scope/payment/timeline sections with NDA-specific sections:
  "Definition of Confidential Information" — comprehensive definition including technical, business, financial, and operational information
  "Obligations of the Receiving Party" — specific safeguards, need-to-know basis, approved personnel only
  "Exclusions from Confidentiality" — public domain, prior knowledge, independent development, required by law
  "Return or Destruction of Information" — process and timeline for return/destruction; certification requirement
  "Remedies for Breach" — acknowledgment of irreparable harm; right to seek injunctive relief without bond
  "Term and Survival" — duration of NDA (typically 2-5 years) and survival after expiration

retainer:
  Add "Monthly Engagement Terms" section: hours allocated per month, overage rate, rollover policy (use-it-or-lose-it vs. rollover with 30-day cap), priority level vs. project clients, response time SLA`
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(input: ContractGenerationInput): string {
  const typeLabel = CONTRACT_TYPE_LABELS[input.contractType] ?? "Freelance Services Agreement"
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const paymentLine =
    input.paymentType === "hourly"
      ? `Hourly rate: $${input.hourlyRate} ${input.currency}/hour`
      : input.paymentType === "milestone"
        ? `Total value: $${(input.totalAmount ?? 0).toLocaleString()} ${input.currency}, paid in milestones`
        : `Fixed fee: $${(input.totalAmount ?? 0).toLocaleString()} ${input.currency}`

  const ipLine = {
    client_upon_payment:
      "All intellectual property rights transfer to Client upon receipt of full payment. Service Provider retains pre-existing IP.",
    freelancer:
      "Service Provider retains all IP rights. Client receives a perpetual, non-exclusive, royalty-free license to use deliverables.",
    shared:
      "Both parties hold joint ownership of deliverables. Each party may use without accounting to the other.",
  }[input.ipOwnership]

  const parts: string[] = [
    `Generate a complete ${typeLabel}.`,
    `Agreement Date: ${today}`,
    ``,
    `PARTIES:`,
    `Service Provider: ${input.freelancerName} (${input.freelancerEmail})`,
    `Client: ${input.clientName}${input.clientCompany ? `, ${input.clientCompany}` : ""} (${input.clientEmail})`,
    ``,
    `CONTRACT TITLE: ${input.title}`,
    ``,
    `PROJECT DESCRIPTION:`,
    input.projectDescription,
    ``,
    `DELIVERABLES (list these specifically in the contract):`,
    input.deliverables,
  ]

  if (input.exclusions?.trim()) {
    parts.push(``, `EXPLICITLY EXCLUDED FROM SCOPE:`, input.exclusions)
  }

  parts.push(
    ``,
    `PAYMENT:`,
    `Type: ${input.paymentType === "fixed" ? "Fixed Price" : input.paymentType === "milestone" ? "Milestone-Based" : "Hourly Rate"}`,
    paymentLine,
  )

  if (input.paymentSchedule?.trim()) {
    parts.push(`Payment Schedule: ${input.paymentSchedule}`)
  }

  parts.push(
    ``,
    `TIMELINE:`,
    `Start: ${input.startDate || "Upon contract execution"}`,
    `End: ${input.endDate || "As agreed in project milestones"}`,
    ``,
    `LEGAL TERMS:`,
    `Intellectual Property: ${ipLine}`,
    `Revisions included: ${input.revisions} rounds${input.revisions > 0 ? " (additional revisions billed at standard rate)" : ""}`,
    `Confidentiality: ${input.includeNda ? "Full mutual NDA required — include comprehensive non-disclosure terms." : "Standard confidentiality clause only."}`,
    `Governing Law: ${input.governingLaw}`,
  )

  if (input.additionalNotes?.trim()) {
    parts.push(``, `ADDITIONAL REQUIREMENTS:`, input.additionalNotes)
  }

  if (input.regenerateFeedback?.trim()) {
    parts.push(
      ``,
      `━━━ REVISION INSTRUCTIONS ━━━`,
      `This is a regeneration. The user has the following feedback — incorporate it:`,
      input.regenerateFeedback,
    )
  }

  parts.push(
    ``,
    `Generate a complete, professional contract. Every section must be fully written with specific details from the above — no brackets, no blanks, no "to be determined."`,
  )

  return parts.join("\n")
}

// ---------------------------------------------------------------------------
// Parse Gemini response
// ---------------------------------------------------------------------------

function parseResponse(rawText: string): GeneratedContract {
  // Strip markdown code fences (Gemini sometimes wraps in ```json ... ```)
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim()

  let parsed: GeneratedContract
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to find JSON object in the response
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error(
        `Gemini returned non-JSON response: ${cleaned.substring(0, 300)}`,
      )
    }
    parsed = JSON.parse(match[0])
  }

  if (!parsed.sections?.length) {
    throw new Error("Generated contract is missing sections")
  }

  return parsed
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a complete contract using Gemini 2.0 Flash.
 * Server-side only — requires GOOGLE_GENERATIVE_AI_API_KEY.
 */
export async function generateContract(
  input: ContractGenerationInput,
): Promise<GeneratedContract> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add it to your .env.local file.",
    )
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.25, // Low temperature for consistent, professional output
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  })

  const fullPrompt = `${buildSystemPrompt()}\n\n---\n\n${buildUserPrompt(input)}`

  const result = await model.generateContent(fullPrompt)
  const rawText = result.response.text()

  return parseResponse(rawText)
}
