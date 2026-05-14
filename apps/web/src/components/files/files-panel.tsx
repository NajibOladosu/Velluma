"use client"

import * as React from "react"
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react"
import { Surface } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { Muted, P } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useFiles,
  useUploadFile,
  useDeleteFile,
  downloadFile,
  type FilesScope,
} from "@/lib/queries/files"

/**
 * Drag-drop + click-to-pick file panel. Mounts on any detail page; pass
 * exactly one of projectId / contractId / clientId / invoiceId.
 */
export function FilesPanel({ scope, title = "Files" }: { scope: FilesScope; title?: string }) {
  const { data: files = [], isLoading } = useFiles(scope)
  const upload = useUploadFile()
  const remove = useDeleteFile()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setError(null)
    for (const f of Array.from(list)) {
      try {
        await upload.mutateAsync({ ...scope, file: f })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed")
        break
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <Surface className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
          <P className="text-sm font-semibold text-zinc-900">{title}</P>
          {files.length > 0 && (
            <Muted className="text-xs">· {files.length}</Muted>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            Upload
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Drag-and-drop zone — only shown when there are no files; collapses
          to a header-row CTA once any file exists to save vertical space. */}
      {files.length === 0 && !isLoading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={
            "w-full p-8 border-2 border-dashed text-center transition-colors " +
            (dragOver ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300")
          }
        >
          <Upload className="h-6 w-6 text-zinc-400 mx-auto mb-2" strokeWidth={1.5} />
          <P className="text-sm font-medium text-zinc-900">Drop a file or click to upload</P>
          <Muted className="text-xs mt-0.5">PDF, image, doc · 50 MB max</Muted>
        </button>
      )}

      {isLoading && (
        <div className="p-4 space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {error && (
        <div className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="divide-y divide-zinc-100">
          {files.map((f) => (
            <div key={f.id} className="px-5 py-3 flex items-center justify-between gap-3 group">
              <div className="min-w-0 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">{f.name}</div>
                  <Muted className="text-xs">
                    {formatSize(f.size)} · {new Date(f.created_at).toLocaleDateString()}
                  </Muted>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Download"
                  className="h-8 w-8"
                  onClick={() => downloadFile(f.id)}
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  className="h-8 w-8 text-zinc-500 hover:text-red-600"
                  onClick={() => remove.mutate({ id: f.id, scope })}
                  disabled={remove.isPending}
                >
                  {remove.isPending && remove.variables?.id === f.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
