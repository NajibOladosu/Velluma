"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload, X } from "lucide-react"
import { parseCsv } from "@/lib/csv"

type Resource = "clients" | "time" | "expenses" | "invoices"

export function CsvImportExport({ resource }: { resource: Resource }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; failed: number; errors: string[] } | null>(null)

  const handleExport = () => {
    window.location.href = `/api/csv/${resource}`
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      const res = await fetch(`/api/csv/${resource}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
        credentials: "include",
      })
      const body = await res.json()
      if (!res.ok) {
        setResult({ inserted: 0, failed: rows.length, errors: [body.error ?? "Import failed"] })
      } else {
        setResult(body)
      }
    } catch (err) {
      setResult({ inserted: 0, failed: 0, errors: [(err as Error).message] })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
        <Upload className="h-4 w-4 mr-2" strokeWidth={1.5} />
        {importing ? "Importing…" : "Import CSV"}
      </Button>
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
        Export CSV
      </Button>

      {result && (
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-zinc-200 bg-zinc-50">
          <span className="text-zinc-700">
            <span className="font-medium text-emerald-700">{result.inserted}</span> imported
            {result.failed > 0 && (
              <>
                {" · "}
                <span className="font-medium text-red-700">{result.failed}</span> failed
              </>
            )}
          </span>
          <button onClick={() => setResult(null)} aria-label="Dismiss" className="text-zinc-400 hover:text-zinc-700">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  )
}
