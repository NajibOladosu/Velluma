"use client"

import * as React from "react"
import {
  Download, FileText, FileImage, FileVideo, FileAudio, FileSpreadsheet,
  FileCode, FileArchive, FileType, Loader2, Search, Trash2, Upload,
} from "lucide-react"
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
  type FileRow,
} from "@/lib/queries/files"

/**
 * Drag-drop + click-to-pick file panel. Mounts on any detail page; pass
 * exactly one of projectId / contractId / clientId / invoiceId.
 *
 * Adds file-type icons, image thumbnails (lazy signed URL), and search.
 */

function fileKind(mime: string | null, name: string): {
  Icon: React.ElementType
  className: string
  isImage: boolean
} {
  const m = (mime ?? "").toLowerCase()
  const ext = name.toLowerCase().split(".").pop() ?? ""
  if (m.startsWith("image/")) return { Icon: FileImage, className: "text-emerald-600", isImage: true }
  if (m.startsWith("video/")) return { Icon: FileVideo, className: "text-violet-600", isImage: false }
  if (m.startsWith("audio/")) return { Icon: FileAudio, className: "text-amber-600", isImage: false }
  if (m === "application/pdf" || ext === "pdf")
    return { Icon: FileType, className: "text-red-600", isImage: false }
  if (["csv", "xls", "xlsx", "ods"].includes(ext) || m.includes("spreadsheet"))
    return { Icon: FileSpreadsheet, className: "text-emerald-700", isImage: false }
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext))
    return { Icon: FileArchive, className: "text-zinc-600", isImage: false }
  if (
    ["js", "ts", "tsx", "jsx", "py", "rb", "rs", "go", "java", "json", "yml", "yaml", "html", "css"].includes(ext) ||
    m.startsWith("text/")
  )
    return { Icon: FileCode, className: "text-blue-600", isImage: false }
  return { Icon: FileText, className: "text-zinc-500", isImage: false }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Lazy image thumbnail — fetches a signed URL via /api/files/[id] when the
 * row first scrolls into view. Falls back to the file-type icon while
 * loading or on error.
 */
function FileThumbnail({
  file,
  Icon,
  iconClassName,
  isImage,
}: {
  file: FileRow
  Icon: React.ElementType
  iconClassName: string
  isImage: boolean
}) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [errored, setErrored] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const requested = React.useRef(false)

  React.useEffect(() => {
    if (!isImage || requested.current) return
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !requested.current) {
          requested.current = true
          fetch(`/api/files/${file.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { url?: string } | null) => {
              if (j?.url) setUrl(j.url)
              else setErrored(true)
            })
            .catch(() => setErrored(true))
          io.disconnect()
        }
      }
    })
    io.observe(node)
    return () => io.disconnect()
  }, [file.id, isImage])

  return (
    <div
      ref={ref}
      className="h-9 w-9 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden"
    >
      {isImage && url && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.name}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <Icon className={`h-4 w-4 ${iconClassName}`} strokeWidth={1.5} />
      )}
    </div>
  )
}

export function FilesPanel({ scope, title = "Files" }: { scope: FilesScope; title?: string }) {
  const { data: files = [], isLoading } = useFiles(scope)
  const upload = useUploadFile()
  const remove = useDeleteFile()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!query.trim()) return files
    const q = query.trim().toLowerCase()
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q) ||
        (f.mime_type ?? "").toLowerCase().includes(q),
    )
  }, [files, query])

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
          {files.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files…"
                className="h-8 pl-7 pr-2 text-xs rounded-md border border-zinc-200 bg-white w-40 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          )}
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

      {/* Drag-and-drop zone — only shown when there are no files. */}
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

      {files.length > 0 && filtered.length === 0 && (
        <div className="p-8 text-center">
          <Muted className="text-sm">No files match &ldquo;{query}&rdquo;.</Muted>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="divide-y divide-zinc-100">
          {filtered.map((f) => {
            const kind = fileKind(f.mime_type, f.name)
            return (
              <div key={f.id} className="px-5 py-3 flex items-center justify-between gap-3 group">
                <div className="min-w-0 flex items-center gap-3">
                  <FileThumbnail
                    file={f}
                    Icon={kind.Icon}
                    iconClassName={kind.className}
                    isImage={kind.isImage}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">{f.name}</div>
                    <Muted className="text-xs">
                      {formatSize(f.size)}
                      {f.mime_type ? ` · ${f.mime_type.split(";")[0]}` : ""}
                      {" · "}
                      {new Date(f.created_at).toLocaleDateString()}
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
            )
          })}
        </div>
      )}
    </Surface>
  )
}
