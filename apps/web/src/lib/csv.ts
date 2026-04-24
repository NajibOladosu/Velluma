/**
 * Tiny CSV utilities. RFC 4180–lite — handles quoted fields with commas,
 * embedded quotes ("") and CRLF line endings. No deps.
 */

export type CsvRow = Record<string, string>

export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (rows.length === 0) return columns ? columns.join(",") + "\n" : ""
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const header = cols.map(escapeCell).join(",")
  const body = rows
    .map((r) => cols.map((c) => escapeCell(formatCell(r[c]))).join(","))
    .join("\n")
  return `${header}\n${body}\n`
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (v instanceof Date) return v.toISOString()
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

function escapeCell(s: string): string {
  if (s == null) return ""
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += c
      i += 1
      continue
    }
    if (c === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (c === ",") {
      cur.push(field)
      field = ""
      i += 1
      continue
    }
    if (c === "\n" || c === "\r") {
      cur.push(field)
      field = ""
      if (cur.length > 1 || cur[0] !== "") rows.push(cur)
      cur = []
      if (c === "\r" && text[i + 1] === "\n") i += 2
      else i += 1
      continue
    }
    field += c
    i += 1
  }
  if (field || cur.length) {
    cur.push(field)
    rows.push(cur)
  }

  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body.map((r) => {
    const obj: CsvRow = {}
    header.forEach((k, idx) => {
      obj[k.trim()] = r[idx] ?? ""
    })
    return obj
  })
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
