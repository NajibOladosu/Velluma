/**
 * TanStack Query hooks for Notifications.
 *
 * Data strategy:
 * - Reads: route through the API Gateway (GET /notifications).
 *   The gateway proxies to the notification-service which uses the service-role
 *   Supabase client so RLS is enforced at the gateway auth layer instead.
 * - Writes (mark-read): PATCH through the gateway.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationRecord {
  id: string
  type: "email" | "in_app" | "sms" | "push"
  title: string
  message: string
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
  related_resource_type: string | null
  related_resource_id: string | null
}

// ---------------------------------------------------------------------------
// Key factory
// ---------------------------------------------------------------------------

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetches the 40 most recent notifications for the authenticated user. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async (): Promise<NotificationRecord[]> => {
      const data = await api.get<NotificationRecord[]>("/notifications")
      return data ?? []
    },
    staleTime: 30_000,       // consider fresh for 30 s
    refetchInterval: 60_000, // poll every 60 s for new notifications
  })
}

/** Derived: count of unread notifications. */
export function useUnreadCount() {
  const { data } = useNotifications()
  return (data ?? []).filter((n) => !n.read_at).length
}

/** Mark a single notification as read. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    // Optimistic update: flip read_at in cache immediately
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() })
      const previous = queryClient.getQueryData<NotificationRecord[]>(notificationKeys.list())

      queryClient.setQueryData<NotificationRecord[]>(notificationKeys.list(), (old) =>
        (old ?? []).map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      )

      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
    },
  })
}

/** Mark all notifications as read. */
export function useMarkAllRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all", {}),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() })
      const previous = queryClient.getQueryData<NotificationRecord[]>(notificationKeys.list())

      queryClient.setQueryData<NotificationRecord[]>(notificationKeys.list(), (old) =>
        (old ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
    },
  })
}
