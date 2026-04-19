/**
 * GET /api/f/[slug] — public: returns a published lead form's definition.
 * POST /api/f/[slug] — public: submits the form, creates a pipeline_lead.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("lead_forms")
    .select("id, slug, title, intro, thank_you, fields")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Form not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  let answers: Record<string, unknown> = {}
  try { answers = await request.json() } catch { /* ok */ }

  const supabase = await createServiceClient()
  const { data: form } = await supabase
    .from("lead_forms")
    .select("id, user_id, fields, thank_you")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 })

  // Extract known fields from answers
  const name  = typeof answers.name  === "string" ? answers.name.trim()  : ""
  const email = typeof answers.email === "string" ? answers.email.trim().toLowerCase() : ""
  const phone = typeof answers.phone === "string" ? answers.phone.trim() : null

  // Validate required fields from the schema
  for (const field of (form.fields as { id: string; label: string; required?: boolean }[])) {
    if (!field.required) continue
    const v = answers[field.id]
    if (v == null || (typeof v === "string" && !v.trim())) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 })
    }
  }

  if (!name || !email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 })
  }

  const { error } = await supabase.from("pipeline_leads").insert({
    tenant_id: form.user_id,
    name, email, phone,
    source: "form",
    stage: "inbox",
    source_form_id: form.id,
    metadata: { answers },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, thankYou: form.thank_you ?? "Thanks — I'll be in touch shortly." }, { status: 201 })
}
