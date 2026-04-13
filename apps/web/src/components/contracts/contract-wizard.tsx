"use client"

/**
 * AI Contract Generation Wizard
 *
 * A multi-step wizard that collects project details and generates a
 * complete, legally-sound contract via Gemini 2.0 Flash.
 *
 * Steps:
 *  1 → Type & Parties
 *  2 → Project Scope
 *  3 → Payment & Timeline
 *  4 → Legal Preferences
 *  5 → Generating (automated)
 *  6 → Review & Finalize
 */
import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { contractKeys } from "@/lib/queries/contracts"
import { cn } from "@/lib/utils"
import {
  X,
  Globe,
  Code2,
  Palette,
  PenLine,
  Briefcase,
  Camera,
  BarChart2,
  Smartphone,
  Lock,
  RefreshCw,
  FileCheck,
  FileText,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  AlertCircle,
  Edit3,
  RotateCcw,
} from "lucide-react"
import type { ContractType } from "@/lib/ai/contract-generator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractSection {
  id: string
  title: string
  content: string
}

interface GeneratedResult {
  contractId: string
  title: string
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

interface WizardForm {
  // Step 1
  contractType: ContractType
  freelancerName: string
  clientName: string
  clientEmail: string
  clientCompany: string
  // Step 2
  title: string
  projectDescription: string
  deliverables: string
  exclusions: string
  // Step 3
  paymentType: "fixed" | "milestone" | "hourly"
  totalAmount: string
  hourlyRate: string
  currency: string
  paymentSchedule: string
  startDate: string
  endDate: string
  // Step 4
  revisions: number
  ipOwnership: "client_upon_payment" | "freelancer" | "shared"
  governingLaw: string
  includeNda: boolean
  additionalNotes: string
}

interface ContractWizardProps {
  open: boolean
  onClose: () => void
  onSuccess: (contractId: string) => void
}

// ---------------------------------------------------------------------------
// Contract type catalogue
// ---------------------------------------------------------------------------

const CONTRACT_TYPES: {
  id: ContractType
  label: string
  description: string
  Icon: React.ElementType
}[] = [
  { id: "web_development", label: "Web Development", description: "Websites, landing pages, web apps", Icon: Globe },
  { id: "software_development", label: "Software / SaaS", description: "Backend, APIs, desktop software", Icon: Code2 },
  { id: "mobile_app", label: "Mobile App", description: "iOS, Android, cross-platform", Icon: Smartphone },
  { id: "design_services", label: "Design", description: "UI/UX, branding, graphic design", Icon: Palette },
  { id: "content_creation", label: "Content & Writing", description: "Copywriting, articles, scripts", Icon: PenLine },
  { id: "consulting", label: "Consulting", description: "Strategy, advisory, expert guidance", Icon: Briefcase },
  { id: "marketing_services", label: "Marketing", description: "Campaigns, SEO, social media", Icon: BarChart2 },
  { id: "photography_video", label: "Photo / Video", description: "Photography, video production", Icon: Camera },
  { id: "retainer", label: "Retainer", description: "Ongoing monthly engagement", Icon: RefreshCw },
  { id: "nda", label: "NDA", description: "Non-disclosure agreement", Icon: Lock },
  { id: "master_services", label: "Master Services", description: "Umbrella agreement for ongoing work", Icon: FileCheck },
  { id: "general_freelance", label: "General Freelance", description: "Flexible general-purpose contract", Icon: FileText },
]

const STEP_LABELS = [
  "Type & Parties",
  "Scope",
  "Payment",
  "Legal",
  "Generating",
  "Review",
]

const GENERATION_STAGES = [
  "Analyzing project requirements...",
  "Drafting core clauses...",
  "Structuring payment terms...",
  "Adding IP protections...",
  "Applying legal standards...",
  "Finalizing your contract...",
]

// ---------------------------------------------------------------------------
// Initial form state
// ---------------------------------------------------------------------------

const INITIAL_FORM: WizardForm = {
  contractType: "web_development",
  freelancerName: "",
  clientName: "",
  clientEmail: "",
  clientCompany: "",
  title: "",
  projectDescription: "",
  deliverables: "",
  exclusions: "",
  paymentType: "fixed",
  totalAmount: "",
  hourlyRate: "",
  currency: "USD",
  paymentSchedule: "",
  startDate: "",
  endDate: "",
  revisions: 2,
  ipOwnership: "client_upon_payment",
  governingLaw: "",
  includeNda: false,
  additionalNotes: "",
}

// ---------------------------------------------------------------------------
// Wizard component
// ---------------------------------------------------------------------------

export function ContractWizard({ open, onClose, onSuccess }: ContractWizardProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<WizardForm>(INITIAL_FORM)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generationStage, setGenerationStage] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<GeneratedResult | null>(null)
  const [editedSections, setEditedSections] = React.useState<Record<string, string>>({})
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [regenerateFeedback, setRegenerateFeedback] = React.useState("")
  const [showRegenerateInput, setShowRegenerateInput] = React.useState(false)

  // Pre-fill freelancer name/email from auth session
  React.useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setForm((prev) => ({
          ...prev,
          freelancerName: prev.freelancerName || data.user!.user_metadata?.full_name || "",
        }))
      }
    })
  }, [open])

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1)
        setForm(INITIAL_FORM)
        setError(null)
        setResult(null)
        setEditedSections({})
        setEditingId(null)
        setRegenerateFeedback("")
        setShowRegenerateInput(false)
        setIsGenerating(false)
      }, 300)
    }
  }, [open])

  // Generation stage animation
  React.useEffect(() => {
    if (!isGenerating) { setGenerationStage(0); return }
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % GENERATION_STAGES.length
      setGenerationStage(i)
    }, 1200)
    return () => clearInterval(interval)
  }, [isGenerating])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function setField<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function generate(feedback?: string) {
    setError(null)
    setIsGenerating(true)
    setStep(5)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const body = {
        contractType: form.contractType,
        freelancerName: form.freelancerName,
        freelancerEmail: user?.email ?? "",
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientCompany: form.clientCompany || undefined,
        title: form.title,
        projectDescription: form.projectDescription,
        deliverables: form.deliverables,
        exclusions: form.exclusions || undefined,
        paymentType: form.paymentType,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        currency: form.currency,
        paymentSchedule: form.paymentSchedule || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        revisions: form.revisions,
        ipOwnership: form.ipOwnership,
        governingLaw: form.governingLaw,
        includeNda: form.includeNda,
        additionalNotes: form.additionalNotes || undefined,
        regenerateFeedback: feedback || undefined,
      }

      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Generation failed")
      }

      const data: GeneratedResult = await res.json()
      setResult(data)
      setEditedSections({})
      setRegenerateFeedback("")
      setShowRegenerateInput(false)
      setStep(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setStep(4) // Back to legal step on error
    } finally {
      setIsGenerating(false)
    }
  }

  function handleRegenerateExisting() {
    if (!result || !regenerateFeedback.trim()) return
    generate(regenerateFeedback)
  }

  function saveEditedSection(id: string, content: string) {
    setEditedSections((prev) => ({ ...prev, [id]: content }))
    setEditingId(null)
  }

  function handleFinalize() {
    if (!result) return
    queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
    onSuccess(result.contractId)
    onClose()
  }

  function canAdvanceStep(): boolean {
    switch (step) {
      case 1:
        return Boolean(form.clientName.trim() && form.clientEmail.trim())
      case 2:
        return Boolean(form.title.trim() && form.projectDescription.trim() && form.deliverables.trim())
      case 3:
        return form.paymentType === "hourly"
          ? Boolean(form.hourlyRate)
          : Boolean(form.totalAmount)
      case 4:
        return Boolean(form.governingLaw.trim())
      default:
        return true
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!open) return null

  const isReviewStep = step === 6
  const panelWidth = isReviewStep ? "max-w-3xl" : "max-w-xl"

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm"
        onClick={step < 5 ? onClose : undefined}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative flex flex-col w-full bg-white border-l border-zinc-200 shadow-xl transition-all duration-300",
          panelWidth,
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-zinc-900 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                {step <= 4 ? "AI Contract Wizard" : step === 5 ? "Generating Contract..." : "Review Your Contract"}
              </div>
              {step <= 4 && (
                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">
                  Step {step} of 4 — {STEP_LABELS[step - 1]}
                </div>
              )}
            </div>
          </div>
          {step !== 5 && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* ── Progress Bar ───────────────────────────────────────────────── */}
        {step <= 4 && (
          <div className="h-0.5 bg-zinc-100">
            <div
              className="h-full bg-zinc-900 transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && <Step1TypeAndParties form={form} setField={setField} />}
          {step === 2 && <Step2Scope form={form} setField={setField} />}
          {step === 3 && <Step3Payment form={form} setField={setField} />}
          {step === 4 && (
            <Step4Legal form={form} setField={setField} error={error} />
          )}
          {step === 5 && (
            <StepGenerating stage={GENERATION_STAGES[generationStage]} />
          )}
          {step === 6 && result && (
            <StepReview
              result={result}
              editedSections={editedSections}
              editingId={editingId}
              setEditingId={setEditingId}
              saveEditedSection={saveEditedSection}
              showRegenerateInput={showRegenerateInput}
              setShowRegenerateInput={setShowRegenerateInput}
              regenerateFeedback={regenerateFeedback}
              setRegenerateFeedback={setRegenerateFeedback}
              onRegenerate={handleRegenerateExisting}
            />
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {step !== 5 && (
          <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
            {step === 6 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateInput(!showRegenerateInput)}
                  className="gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
                <Button className="gap-2 font-semibold px-6" onClick={handleFinalize}>
                  <Check className="h-4 w-4" />
                  Save Contract Draft
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
                  className="gap-1 text-zinc-500"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {step === 1 ? "Cancel" : "Back"}
                </Button>
                <Button
                  onClick={() => (step === 4 ? generate() : setStep((s) => s + 1))}
                  disabled={!canAdvanceStep()}
                  className="gap-2 font-semibold px-6"
                >
                  {step === 4 ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Contract
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Contract Type & Parties
// ---------------------------------------------------------------------------

function Step1TypeAndParties({
  form,
  setField,
}: {
  form: WizardForm
  setField: <K extends keyof WizardForm>(k: K, v: WizardForm[K]) => void
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">Contract Type</h3>
        <p className="text-xs text-zinc-500">Choose the type of work this contract covers.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CONTRACT_TYPES.map((ct) => (
          <button
            key={ct.id}
            onClick={() => setField("contractType", ct.id)}
            className={cn(
              "flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all",
              form.contractType === ct.id
                ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50",
            )}
          >
            <ct.Icon
              className={cn(
                "h-4 w-4",
                form.contractType === ct.id ? "text-zinc-900" : "text-zinc-400",
              )}
              strokeWidth={1.5}
            />
            <div>
              <div className="text-xs font-semibold text-zinc-900 leading-tight">{ct.label}</div>
              <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">{ct.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700">Your Name</label>
          <Input
            placeholder="Your full name"
            value={form.freelancerName}
            onChange={(e) => setField("freelancerName", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Client Name <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="Client's full name"
              value={form.clientName}
              onChange={(e) => setField("clientName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Client Email <span className="text-red-400">*</span>
            </label>
            <Input
              type="email"
              placeholder="client@company.com"
              value={form.clientEmail}
              onChange={(e) => setField("clientEmail", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700">
            Client Company <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <Input
            placeholder="Acme Corp"
            value={form.clientCompany}
            onChange={(e) => setField("clientCompany", e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Project Scope
// ---------------------------------------------------------------------------

function Step2Scope({
  form,
  setField,
}: {
  form: WizardForm
  setField: <K extends keyof WizardForm>(k: K, v: WizardForm[K]) => void
}) {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">Project Scope</h3>
        <p className="text-xs text-zinc-500">
          Be specific — the AI uses these details to draft precise deliverables and acceptance criteria.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700">
          Contract Title <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="e.g., E-Commerce Website Redesign for Acme Corp"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700">
          Project Description <span className="text-red-400">*</span>
        </label>
        <Textarea
          placeholder="Describe the project in detail. What problem does it solve? What is the business context? The more detail you provide, the better the contract clauses will be."
          value={form.projectDescription}
          onChange={(e) => setField("projectDescription", e.target.value)}
          className="min-h-[100px] resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700">
          Deliverables <span className="text-red-400">*</span>
        </label>
        <Textarea
          placeholder={"List each deliverable on its own line, e.g.:\n• Responsive 5-page website (Home, About, Services, Portfolio, Contact)\n• Custom CMS integration\n• Mobile-first design (iOS & Android)\n• Google Analytics setup\n• 1 month post-launch support"}
          value={form.deliverables}
          onChange={(e) => setField("deliverables", e.target.value)}
          className="min-h-[110px] resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700">
          Explicitly Excluded <span className="text-zinc-400 font-normal">(optional but recommended)</span>
        </label>
        <Textarea
          placeholder={"What is NOT included in this contract, e.g.:\n• Ongoing hosting or maintenance\n• Third-party plugin licenses\n• Copywriting or stock photography"}
          value={form.exclusions}
          onChange={(e) => setField("exclusions", e.target.value)}
          className="min-h-[80px] resize-none"
        />
        <p className="text-[10px] text-zinc-400">
          Defining scope exclusions prevents disputes about scope creep.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Payment & Timeline
// ---------------------------------------------------------------------------

function Step3Payment({
  form,
  setField,
}: {
  form: WizardForm
  setField: <K extends keyof WizardForm>(k: K, v: WizardForm[K]) => void
}) {
  return (
    <div className="p-6 space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">Payment & Timeline</h3>
        <p className="text-xs text-zinc-500">
          Specific amounts and schedules produce stronger payment protection clauses.
        </p>
      </div>

      {/* Payment type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-700">Payment Structure</label>
        <div className="flex border border-zinc-200 rounded-md p-0.5 gap-0.5">
          {(["fixed", "milestone", "hourly"] as const).map((pt) => (
            <button
              key={pt}
              onClick={() => setField("paymentType", pt)}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-sm transition-all capitalize",
                form.paymentType === pt
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {pt === "milestone" ? "Milestones" : pt.charAt(0).toUpperCase() + pt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Amount fields */}
      <div className="grid grid-cols-2 gap-3">
        {form.paymentType === "hourly" ? (
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-zinc-700">
              Hourly Rate <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <Input
                type="number"
                placeholder="150"
                className="pl-7"
                value={form.hourlyRate}
                onChange={(e) => setField("hourlyRate", e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-zinc-700">
              Total Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <Input
                type="number"
                placeholder="10,000"
                className="pl-7"
                value={form.totalAmount}
                onChange={(e) => setField("totalAmount", e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setField("currency", e.target.value)}
            className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
          >
            {["USD", "EUR", "GBP", "CAD", "AUD", "SGD"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {form.paymentType !== "hourly" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700">
            Payment Schedule{" "}
            <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <Input
            placeholder="e.g., 50% on signing, 25% at midpoint, 25% on delivery"
            value={form.paymentSchedule}
            onChange={(e) => setField("paymentSchedule", e.target.value)}
          />
          <p className="text-[10px] text-zinc-400">
            If blank, AI will generate a reasonable schedule based on contract type.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700">Start Date</label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700">Deadline</label>
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => setField("endDate", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-700">
          Revisions Included: {form.revisions}
        </label>
        <input
          type="range"
          min={0}
          max={10}
          value={form.revisions}
          onChange={(e) => setField("revisions", Number(e.target.value))}
          className="w-full accent-zinc-900"
        />
        <div className="flex justify-between text-[10px] text-zinc-400">
          <span>0 rounds</span>
          <span>5</span>
          <span>10 rounds</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Legal Preferences
// ---------------------------------------------------------------------------

function Step4Legal({
  form,
  setField,
  error,
}: {
  form: WizardForm
  setField: <K extends keyof WizardForm>(k: K, v: WizardForm[K]) => void
  error: string | null
}) {
  const ipOptions: { id: WizardForm["ipOwnership"]; label: string; desc: string }[] = [
    {
      id: "client_upon_payment",
      label: "Client owns upon full payment",
      desc: "Full IP transfers to client when final payment is received. Most common for bespoke work.",
    },
    {
      id: "freelancer",
      label: "Service provider retains IP",
      desc: "Freelancer keeps all rights; client receives a perpetual license. Common for template-based work.",
    },
    {
      id: "shared",
      label: "Joint ownership",
      desc: "Both parties hold equal rights. Suitable for collaborative co-creation projects.",
    },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">Legal Preferences</h3>
        <p className="text-xs text-zinc-500">
          These settings shape key protective clauses in your contract.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-red-700">Generation failed</div>
            <div className="text-xs text-red-600 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* IP Ownership */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-700">Intellectual Property Ownership</label>
        <div className="space-y-2">
          {ipOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setField("ipOwnership", opt.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all",
                form.ipOwnership === opt.id
                  ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-300",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  form.ipOwnership === opt.id ? "border-zinc-900" : "border-zinc-300",
                )}
              >
                {form.ipOwnership === opt.id && (
                  <div className="h-2 w-2 rounded-full bg-zinc-900" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-900">{opt.label}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Governing Law */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700">
          Governing Law & Jurisdiction <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="e.g., State of California, United States"
          value={form.governingLaw}
          onChange={(e) => setField("governingLaw", e.target.value)}
        />
      </div>

      {/* NDA */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
        <input
          type="checkbox"
          id="nda-check"
          checked={form.includeNda}
          onChange={(e) => setField("includeNda", e.target.checked)}
          className="mt-0.5 accent-zinc-900 h-4 w-4 cursor-pointer"
        />
        <label htmlFor="nda-check" className="cursor-pointer">
          <div className="text-xs font-semibold text-zinc-900">Include full NDA clause</div>
          <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
            Add comprehensive mutual non-disclosure terms. Both parties agree to keep project details confidential.
          </div>
        </label>
      </div>

      {/* Additional notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700">
          Additional Instructions for AI{" "}
          <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="Any specific clauses, terms, or requirements you want included. e.g., 'Add a non-solicitation clause valid for 12 months' or 'Include a 30-day post-launch bug-fix warranty'"
          value={form.additionalNotes}
          onChange={(e) => setField("additionalNotes", e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Generating
// ---------------------------------------------------------------------------

function StepGenerating({ stage }: { stage: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-8 text-center space-y-6">
      {/* Pulsing icon */}
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-zinc-900 animate-ping opacity-20" />
      </div>

      <div className="space-y-2">
        <div className="text-base font-semibold text-zinc-900">Drafting your contract</div>
        <div className="text-sm text-zinc-500 transition-all duration-500 min-h-[20px]">{stage}</div>
      </div>

      {/* Stage dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>

      <p className="text-xs text-zinc-400 max-w-xs">
        Gemini is analysing your project requirements and drafting all clauses. This takes 10–20 seconds.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 6 — Review
// ---------------------------------------------------------------------------

function StepReview({
  result,
  editedSections,
  editingId,
  setEditingId,
  saveEditedSection,
  showRegenerateInput,
  setShowRegenerateInput,
  regenerateFeedback,
  setRegenerateFeedback,
  onRegenerate,
}: {
  result: GeneratedResult
  editedSections: Record<string, string>
  editingId: string | null
  setEditingId: (id: string | null) => void
  saveEditedSection: (id: string, content: string) => void
  showRegenerateInput: boolean
  setShowRegenerateInput: (v: boolean) => void
  regenerateFeedback: string
  setRegenerateFeedback: (v: string) => void
  onRegenerate: () => void
}) {
  const [localEdit, setLocalEdit] = React.useState("")

  function startEdit(section: ContractSection) {
    setLocalEdit(editedSections[section.id] ?? section.content)
    setEditingId(section.id)
  }

  const sections = result.sections

  return (
    <div className="p-6 space-y-5">
      {/* Contract header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-zinc-900 flex items-center justify-center shrink-0">
            <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            AI Draft Complete
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 leading-snug">
          {result.title}
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed">{result.summary}</p>

        {result.metadata.keyTerms?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {result.metadata.keyTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center px-2 py-0.5 rounded-full border border-zinc-200 text-[10px] font-medium text-zinc-600 bg-zinc-50"
              >
                {term}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Inline regenerate input */}
      {showRegenerateInput && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 space-y-3">
          <div className="text-xs font-semibold text-zinc-700">What would you like to change?</div>
          <Textarea
            placeholder="e.g., 'Make the payment terms more client-friendly' or 'Add a 60-day post-launch support period' or 'Strengthen the IP ownership clause'"
            value={regenerateFeedback}
            onChange={(e) => setRegenerateFeedback(e.target.value)}
            className="min-h-[80px] resize-none text-sm bg-white"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowRegenerateInput(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!regenerateFeedback.trim()}
              onClick={onRegenerate}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-0 divide-y divide-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
        {sections.map((section) => {
          const isEditing = editingId === section.id
          const displayContent = editedSections[section.id] ?? section.content
          const isEdited = Boolean(editedSections[section.id])

          return (
            <div key={section.id} className="group">
              <div className="px-4 py-3 bg-zinc-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900">{section.title}</span>
                  {isEdited && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full bg-amber-50">
                      Edited
                    </span>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(section)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              <div className="px-4 py-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={localEdit}
                      onChange={(e) => setLocalEdit(e.target.value)}
                      className="min-h-[120px] resize-none text-sm leading-relaxed font-mono text-zinc-700"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEditedSection(section.id, localEdit)}
                        className="gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                    {displayContent}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-zinc-400 text-center pb-2">
        This draft is for review purposes. We recommend having a qualified attorney review any legally binding agreement.
      </p>
    </div>
  )
}
