"use client"

import { Button } from "@/components/ui/button"
import { Check, X, Trash2 } from "lucide-react"

export function BulkActionBar({
  count,
  resource,
  ids,
  onClear,
  onDone,
}: {
  count: number
  resource: "time" | "expenses"
  ids: string[]
  onClear: () => void
  onDone?: () => void
}) {
  if (count === 0) return null

  const run = async (action: "approve" | "reject" | "delete") => {
    const res = await fetch(`/api/bulk/${resource}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, action }),
      credentials: "include",
    })
    if (res.ok) {
      onClear()
      onDone?.()
    }
  }

  return (
    <div className="sticky bottom-6 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 shadow-lg">
      <div className="text-sm font-medium text-zinc-900">{count} selected</div>
      <div className="flex-1" />
      <Button size="sm" variant="outline" onClick={() => run("approve")}>
        <Check className="h-4 w-4 mr-1 text-emerald-600" strokeWidth={1.5} />
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("reject")}>
        <X className="h-4 w-4 mr-1 text-zinc-500" strokeWidth={1.5} />
        Reject
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("delete")}>
        <Trash2 className="h-4 w-4 mr-1 text-red-600" strokeWidth={1.5} />
        Delete
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
}
