/**
 * Files / Documents — TanStack hooks that talk to /api/files.
 *
 * Single catalog covers project / contract / client / invoice attachments
 * — pass exactly one entity filter per query.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface FileRow {
  id: string
  tenant_id: string
  uploaded_by: string
  project_id: string | null
  contract_id: string | null
  client_id: string | null
  invoice_id: string | null
  name: string
  size: number
  mime_type: string | null
  storage_path: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface FilesScope {
  projectId?: string
  contractId?: string
  clientId?: string
  invoiceId?: string
}

function scopeQS(s: FilesScope): string {
  const p = new URLSearchParams()
  if (s.projectId)  p.set("project_id",  s.projectId)
  if (s.contractId) p.set("contract_id", s.contractId)
  if (s.clientId)   p.set("client_id",   s.clientId)
  if (s.invoiceId)  p.set("invoice_id",  s.invoiceId)
  return p.toString()
}

function scopeKey(s: FilesScope): string {
  return s.projectId ?? s.contractId ?? s.clientId ?? s.invoiceId ?? "none"
}

export const filesKeys = {
  all: ["files"] as const,
  list: (scope: FilesScope) =>
    [...filesKeys.all, "list", scopeKey(scope)] as const,
}

export function useFiles(scope: FilesScope) {
  const enabled = Boolean(
    scope.projectId || scope.contractId || scope.clientId || scope.invoiceId,
  )
  return useQuery({
    queryKey: filesKeys.list(scope),
    queryFn: async (): Promise<FileRow[]> => {
      const res = await fetch(`/api/files?${scopeQS(scope)}`)
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? "Failed to load files")
      }
      const { data } = (await res.json()) as { data: FileRow[] }
      return data ?? []
    },
    enabled,
  })
}

export interface UploadFilePayload extends FilesScope {
  file: File
  description?: string
}

export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: UploadFilePayload): Promise<FileRow> => {
      const form = new FormData()
      form.append("file", p.file)
      if (p.projectId)  form.append("project_id",  p.projectId)
      if (p.contractId) form.append("contract_id", p.contractId)
      if (p.clientId)   form.append("client_id",   p.clientId)
      if (p.invoiceId)  form.append("invoice_id",  p.invoiceId)
      if (p.description) form.append("description", p.description)

      const res = await fetch("/api/files", { method: "POST", body: form })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? "Upload failed")
      }
      const { data } = (await res.json()) as { data: FileRow }
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: filesKeys.list(vars) })
    },
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; scope: FilesScope }) => {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? "Delete failed")
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: filesKeys.list(vars.scope) })
    },
  })
}

/** Fetch a signed download URL and trigger a browser download. */
export async function downloadFile(id: string): Promise<void> {
  const res = await fetch(`/api/files/${id}`, { method: "GET" })
  if (!res.ok) throw new Error("Download failed")
  const { url, name } = (await res.json()) as { url: string; name: string }
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
