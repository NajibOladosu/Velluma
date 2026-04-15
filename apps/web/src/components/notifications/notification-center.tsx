"use client"

import * as React from "react"
import {
  Bell,
  CheckCheck,
  FileText,
  CreditCard,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type NotificationRecord,
} from "@/lib/queries/notifications"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateString).toLocaleDateString()
}

function NotificationIcon({ type }: { type: NotificationRecord["type"] }) {
  const cls = "h-4 w-4 shrink-0"
  switch (type) {
    case "push":
      return <Bell className={cn(cls, "text-zinc-500")} strokeWidth={1.5} />
    case "email":
      return <FileText className={cn(cls, "text-zinc-500")} strokeWidth={1.5} />
    case "sms":
      return <Info className={cn(cls, "text-zinc-500")} strokeWidth={1.5} />
    default:
      return <CreditCard className={cn(cls, "text-zinc-500")} strokeWidth={1.5} />
  }
}

// ---------------------------------------------------------------------------
// Single notification row
// ---------------------------------------------------------------------------

function NotificationRow({ notification }: { notification: NotificationRecord }) {
  const { mutate: markRead } = useMarkNotificationRead()
  const isUnread = !notification.read_at

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-4 py-3 flex gap-3 items-start transition-colors",
        isUnread
          ? "bg-zinc-50 hover:bg-zinc-100"
          : "bg-white hover:bg-zinc-50",
      )}
      onClick={() => {
        if (isUnread) markRead(notification.id)
      }}
    >
      {/* Unread dot */}
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
          isUnread ? "bg-zinc-900" : "bg-transparent",
        )}
      />

      <NotificationIcon type={notification.type} />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm truncate",
            isUnread ? "font-medium text-zinc-900" : "text-zinc-700",
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      <time className="text-[11px] text-zinc-400 shrink-0 mt-0.5">
        {relativeTime(notification.created_at)}
      </time>
    </button>
  )
}

// ---------------------------------------------------------------------------
// NotificationCenter panel (rendered inside the DropdownMenuContent)
// ---------------------------------------------------------------------------

export function NotificationCenter() {
  const { data: notifications, isLoading } = useNotifications()
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead()

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length
  const hasNotifications = (notifications ?? []).length > 0

  return (
    // Prevent DropdownMenuContent's onClick-to-close from firing inside the panel
    <div onClick={(e) => e.stopPropagation()} className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-zinc-900 text-white text-[10px] font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900"
            onClick={() => markAllRead()}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3 w-3 mr-1" strokeWidth={1.5} />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto max-h-[360px] divide-y divide-zinc-100">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-4 rounded mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasNotifications ? (
          <div className="py-12 flex flex-col items-center gap-2 text-zinc-400">
            <Bell className="h-8 w-8" strokeWidth={1} />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          (notifications ?? []).map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))
        )}
      </div>

      {/* Footer */}
      {hasNotifications && !isLoading && (
        <div className="px-4 py-2 border-t border-zinc-100">
          <p className="text-[11px] text-zinc-400 text-center">
            Showing latest 40 notifications
          </p>
        </div>
      )}
    </div>
  )
}
