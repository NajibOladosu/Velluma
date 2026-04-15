"use client"

import * as React from "react"
import { Bell, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"
import { NotificationCenter } from "./notification-center"
import { useUnreadCount } from "@/lib/queries/notifications"
import { usePushNotifications } from "@/hooks/use-push-notifications"

export function NotificationBell() {
  const unreadCount = useUnreadCount()
  const { state, subscribe } = usePushNotifications()

  // Prompt to subscribe once if the user hasn't been asked yet and push is supported
  React.useEffect(() => {
    if (state === "unsubscribed") {
      // Non-intrusive: only auto-subscribe if permission hasn't been decided yet
      if (Notification.permission === "default") {
        // Don't auto-prompt — let the user click the bell first
      }
    }
  }, [state])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-zinc-500 hover:text-zinc-900"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "Notifications"
          }
        >
          {state === "denied" ? (
            <BellOff className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <Bell className="h-5 w-5" strokeWidth={1.5} />
          )}

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute top-1 right-1 flex items-center justify-center",
                "h-4 min-w-[1rem] px-1 rounded-full",
                "bg-zinc-900 text-white text-[9px] font-semibold leading-none",
                "pointer-events-none",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0 overflow-hidden">
        {/* stopPropagation prevents DropdownMenuContent's own onClick-to-close handler */}
        <div onClick={(e) => e.stopPropagation()}>
          <NotificationCenter />

          {/* Push opt-in prompt — shown while unsubscribed and permission not yet granted */}
          {state === "unsubscribed" && typeof Notification !== "undefined" && Notification.permission === "default" && (
            <div className="border-t border-zinc-100 px-4 py-3 flex items-center gap-3 bg-zinc-50">
              <Bell className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-zinc-600 flex-1">
                Enable push notifications to get alerts even when the app is closed.
              </p>
              <button
                type="button"
                className="text-xs font-medium text-zinc-900 hover:underline shrink-0"
                onClick={subscribe}
              >
                Enable
              </button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
