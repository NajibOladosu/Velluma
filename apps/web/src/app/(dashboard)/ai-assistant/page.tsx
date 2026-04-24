"use client"

import { useState } from "react"
import { Surface } from "@/components/ui/surface"
import { H1, H3, Muted, P } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, FileText, AlertTriangle, Check, Loader2 } from "lucide-react"

type Mode = "proposal" | "review"

interface ProposalDraft {
  executiveSummary: string
  scope: string
  deliverables: string[]
  timeline: string
  pricing: string
  terms: string
}

interface ContractReview {
  summary: string
  missingClauses: string[]
  issues: Array<{ clause: string; severity: "low" | "medium" | "high"; concern: string; suggestion: string }>
  overallRisk: "low" | "medium" | "high"
}

export default function AiAssistantPage() {
  const [mode, setMode] = useState<Mode>("proposal")

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div>
        <H1>AI Assistant</H1>
        <Muted>Draft proposals in seconds. Get a second set of eyes on any contract.</Muted>
      </div>

      <div className="flex gap-2">
        <Button variant={mode === "proposal" ? "default" : "outline"} onClick={() => setMode("proposal")}>
          <Sparkles className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Proposal copilot
        </Button>
        <Button variant={mode === "review" ? "default" : "outline"} onClick={() => setMode("review")}>
          <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Contract review
        </Button>
      </div>

      {mode === "proposal" ? <ProposalCopilot /> : <ContractReviewer />}
    </div>
  )
}

function ProposalCopilot() {
  const [clientName, setClientName] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [scope, setScope] = useState("")
  const [budget, setBudget] = useState("")
  const [timelineWeeks, setTimelineWeeks] = useState("")
  const [tone, setTone] = useState<"professional" | "friendly" | "concise">("professional")
  const [draft, setDraft] = useState<ProposalDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDraft = async () => {
    setBusy(true)
    setError(null)
    setDraft(null)
    try {
      const res = await fetch("/api/ai/proposal-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientName,
          projectTitle,
          scope,
          budget: budget ? Number(budget) : undefined,
          timelineWeeks: timelineWeeks ? Number(timelineWeeks) : undefined,
          tone,
        }),
        credentials: "include",
      })
      const body = await res.json()
      if (!res.ok) setError(body.error ?? "Unable to draft proposal")
      else setDraft(body as ProposalDraft)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Surface className="p-6 space-y-4">
        <H3 className="text-base">Inputs</H3>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Client name</label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Inc." />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Project title</label>
          <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Website redesign" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Scope notes</label>
          <Textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={6}
            placeholder="What the client asked for. Any constraints. Rough goals."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Budget (USD)</label>
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="15000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Timeline (weeks)</label>
            <Input type="number" value={timelineWeeks} onChange={(e) => setTimelineWeeks(e.target.value)} placeholder="6" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="concise">Concise</option>
          </select>
        </div>
        <Button onClick={handleDraft} disabled={busy || !clientName || !projectTitle || !scope} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" strokeWidth={1.5} /> : <Sparkles className="h-4 w-4 mr-2" strokeWidth={1.5} />}
          {busy ? "Drafting…" : "Draft proposal"}
        </Button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </Surface>

      <Surface className="p-6 space-y-5">
        <H3 className="text-base">Draft</H3>
        {!draft ? (
          <Muted>Your draft will appear here.</Muted>
        ) : (
          <>
            <Section title="Executive summary">
              <P className="text-sm">{draft.executiveSummary}</P>
            </Section>
            <Section title="Scope">
              <pre className="text-sm whitespace-pre-wrap font-sans text-zinc-700">{draft.scope}</pre>
            </Section>
            <Section title="Deliverables">
              <ul className="text-sm space-y-1">
                {draft.deliverables.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" strokeWidth={1.5} />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Timeline">
              <P className="text-sm">{draft.timeline}</P>
            </Section>
            <Section title="Pricing">
              <P className="text-sm">{draft.pricing}</P>
            </Section>
            <Section title="Terms">
              <P className="text-sm">{draft.terms}</P>
            </Section>
          </>
        )}
      </Surface>
    </div>
  )
}

function ContractReviewer() {
  const [text, setText] = useState("")
  const [perspective, setPerspective] = useState<"freelancer" | "client">("freelancer")
  const [review, setReview] = useState<ContractReview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReview = async () => {
    setBusy(true)
    setError(null)
    setReview(null)
    try {
      const res = await fetch("/api/ai/contract-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractText: text, perspective }),
        credentials: "include",
      })
      const body = await res.json()
      if (!res.ok) setError(body.error ?? "Unable to review")
      else setReview(body as ContractReview)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const riskColor = (r: "low" | "medium" | "high") =>
    r === "high" ? "border-red-200 text-red-700" : r === "medium" ? "border-amber-200 text-amber-700" : "border-emerald-200 text-emerald-700"

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Surface className="p-6 space-y-4">
        <H3 className="text-base">Contract</H3>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Reviewing as</label>
          <div className="flex gap-2">
            <Button size="sm" variant={perspective === "freelancer" ? "default" : "outline"} onClick={() => setPerspective("freelancer")}>
              Freelancer
            </Button>
            <Button size="sm" variant={perspective === "client" ? "default" : "outline"} onClick={() => setPerspective("client")}>
              Client
            </Button>
          </div>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          placeholder="Paste the full contract text here."
        />
        <Button onClick={handleReview} disabled={busy || text.length < 50} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" strokeWidth={1.5} /> : <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />}
          {busy ? "Reviewing…" : "Review contract"}
        </Button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </Surface>

      <Surface className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <H3 className="text-base">Findings</H3>
          {review && (
            <Badge variant="outline" className={riskColor(review.overallRisk)}>
              {review.overallRisk} risk
            </Badge>
          )}
        </div>
        {!review ? (
          <Muted>Findings will appear here.</Muted>
        ) : (
          <>
            <Section title="Summary">
              <P className="text-sm">{review.summary}</P>
            </Section>
            {review.missingClauses.length > 0 && (
              <Section title="Missing clauses">
                <ul className="text-sm space-y-1">
                  {review.missingClauses.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" strokeWidth={1.5} />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {review.issues.length > 0 && (
              <Section title="Issues">
                <div className="space-y-3">
                  {review.issues.map((iss, i) => (
                    <div key={i} className="rounded-md border border-zinc-200 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={riskColor(iss.severity)}>
                          {iss.severity}
                        </Badge>
                        <span className="text-sm font-medium text-zinc-900 truncate">{iss.clause}</span>
                      </div>
                      <P className="text-xs text-zinc-600 mb-2">{iss.concern}</P>
                      <P className="text-xs text-zinc-900">
                        <span className="font-medium">Suggest:</span> {iss.suggestion}
                      </P>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </Surface>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Muted className="text-[10px] uppercase tracking-widest font-bold mb-2">{title}</Muted>
      {children}
    </div>
  )
}
