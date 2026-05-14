/**
 * GET  /api/files?project_id=&contract_id=&client_id=&invoice_id=
 *   List files for an owning entity (one filter required).
 *
 * POST /api/files
 *   multipart/form-data:
 *     file:        File
 *     project_id?: uuid
 *     contract_id?: uuid
 *     client_id?:  uuid
 *     invoice_id?: uuid
 *     description?: text
 *
 *   Stores the blob in the private `files` bucket at
 *     {tenant_id}/{entity_kind}/{entity_id}/{file_id}-{safe-name}
 *   and writes a row to public.files.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120)
}

function pickEntity(form: FormData | URLSearchParams) {
  const projectId  = (form.get("project_id")  as string | null) || null
  const contractId = (form.get("contract_id") as string | null) || null
  const clientId   = (form.get("client_id")   as string | null) || null
  const invoiceId  = (form.get("invoice_id")  as string | null) || null
  return { projectId, contractId, clientId, invoiceId }
}

function entityKind(e: ReturnType<typeof pickEntity>): string | null {
  if (e.projectId)  return "project"
  if (e.contractId) return "contract"
  if (e.clientId)   return "client"
  if (e.invoiceId)  return "invoice"
  return null
}

function entityId(e: ReturnType<typeof pickEntity>): string | null {
  return e.projectId ?? e.contractId ?? e.clientId ?? e.invoiceId
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — list
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const entity = pickEntity(url.searchParams)
  if (!entityId(entity)) {
    return NextResponse.json({ error: "One of project_id, contract_id, client_id, invoice_id is required" }, { status: 400 })
  }

  let q = supabase.from("files").select("*").order("created_at", { ascending: false })
  if (entity.projectId)  q = q.eq("project_id",  entity.projectId)
  if (entity.contractId) q = q.eq("contract_id", entity.contractId)
  if (entity.clientId)   q = q.eq("client_id",   entity.clientId)
  if (entity.invoiceId)  q = q.eq("invoice_id",  entity.invoiceId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — upload
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await request.formData()
  const entity = pickEntity(form)
  const kind = entityKind(entity)
  const eid  = entityId(entity)
  if (!kind || !eid) {
    return NextResponse.json({ error: "Attach to a project, contract, client, or invoice" }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "`file` field required" }, { status: 400 })
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 })
  }

  const description = (form.get("description") as string | null) || null
  const safe = sanitizeName(file.name)
  const id = crypto.randomUUID()
  const path = `${user.id}/${kind}/${eid}/${id}-${safe}`

  // Service-role upload — RLS on storage.objects requires `owner = auth.uid()`,
  // but we want freelancers to attach via API without setting an owner header.
  // Service role bypasses RLS for the blob; the catalog row's RLS still
  // enforces tenancy.
  const service = await createServiceClient()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await service.storage
    .from("files")
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: row, error } = await supabase
    .from("files")
    .insert({
      id,
      tenant_id: user.id,
      uploaded_by: user.id,
      project_id: entity.projectId,
      contract_id: entity.contractId,
      client_id: entity.clientId,
      invoice_id: entity.invoiceId,
      name: file.name,
      size: file.size,
      mime_type: file.type || null,
      storage_path: path,
      description,
    })
    .select("*")
    .single()
  if (error) {
    // Best-effort cleanup on metadata-insert failure.
    await service.storage.from("files").remove([path]).catch(() => {})
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: row }, { status: 201 })
}
