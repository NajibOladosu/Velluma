/**
 * GET    /api/files/[id]/download  → 307 to a short-lived signed URL
 * DELETE /api/files/[id]           → remove blob + row (cascades via tenant RLS)
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createServiceClient } from "@/utils/supabase/server"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: row } = await supabase
    .from("files")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle<{ id: string; storage_path: string }>()
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const service = await createServiceClient()
  await service.storage.from("files").remove([row.storage_path]).catch(() => {})

  const { error } = await supabase.from("files").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: row } = await supabase
    .from("files")
    .select("id, storage_path, name, mime_type")
    .eq("id", id)
    .maybeSingle<{ id: string; storage_path: string; name: string; mime_type: string | null }>()
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const service = await createServiceClient()
  const { data: signed, error } = await service.storage
    .from("files")
    .createSignedUrl(row.storage_path, 300, { download: row.name })
  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? "Sign failed" }, { status: 500 })
  }
  return NextResponse.json({ url: signed.signedUrl, name: row.name, mime_type: row.mime_type })
}
