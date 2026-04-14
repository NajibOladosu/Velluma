"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DropdownMenuContext {
  open: boolean
  setOpen: (v: boolean) => void
}

const Ctx = React.createContext<DropdownMenuContext>({ open: false, setOpen: () => {} })

// ---------------------------------------------------------------------------
// DropdownMenu root
// ---------------------------------------------------------------------------

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  // Close on click outside
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <Ctx.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </Ctx.Provider>
  )
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

interface TriggerProps {
  asChild?: boolean
  children: React.ReactElement<Record<string, unknown>>
}

function DropdownMenuTrigger({ children, asChild }: TriggerProps) {
  const { setOpen, open } = React.useContext(Ctx)
  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpen(!open)
        const existingOnClick = children.props.onClick
        if (typeof existingOnClick === "function") existingOnClick(e)
      },
    })
  }
  return (
    <button onClick={() => setOpen(!open)} type="button">
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center"
}

function DropdownMenuContent({
  align = "end",
  className,
  children,
  ...props
}: ContentProps) {
  const { open, setOpen } = React.useContext(Ctx)
  if (!open) return null

  const alignClass =
    align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2"

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 min-w-[8rem] rounded-md border border-zinc-200 bg-white py-1 shadow-lg",
        alignClass,
        className,
      )}
      onClick={() => setOpen(false)}
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

function DropdownMenuItem({
  className,
  children,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="menuitem"
      className={cn(
        "flex cursor-pointer items-center px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("my-1 border-t border-zinc-100", className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
