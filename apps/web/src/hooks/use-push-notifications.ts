"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api-client"

// Convert a URL-safe base64 string to a Uint8Array (required by PushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

type PushState =
  | "unsupported"   // browser has no Push API
  | "denied"        // user blocked notifications
  | "subscribed"    // active push subscription in place
  | "unsubscribed"  // supported + granted but not yet subscribed
  | "loading"

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading")
  const [error, setError] = useState<string | null>(null)

  // Determine initial state on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported")
      return
    }

    const permission = typeof Notification !== "undefined" ? Notification.permission : "default"
    if (permission === "denied") {
      setState("denied")
      return
    }

    // Check whether we already have a subscription
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription(),
    ).then((sub) => {
      setState(sub ? "subscribed" : "unsubscribed")
    }).catch(() => setState("unsubscribed"))
  }, [])

  const subscribe = useCallback(async () => {
    setError(null)
    try {
      // 1. Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      await navigator.serviceWorker.ready

      // 2. Request notification permission
      const permission = await Notification.requestPermission()
      if (permission === "denied") {
        setState("denied")
        return
      }

      // 3. Fetch VAPID public key
      const { vapidPublicKey } = await api.get<{ vapidPublicKey: string }>(
        "/notifications/push/vapid-key",
      )
      if (!vapidPublicKey) throw new Error("Server did not return a VAPID public key")

      // 4. Subscribe with the browser Push API
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast required: TS types Uint8Array<ArrayBufferLike> but PushManager
        // accepts any ArrayBufferView — the cast is safe at runtime.
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer,
      })

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      // 5. Persist subscription on the server
      await api.post("/notifications/push/subscribe", {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent,
      })

      setState("subscribed")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to subscribe"
      setError(msg)
      console.error("[push] subscribe error:", err)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      // Remove from browser
      await sub.unsubscribe()

      // Remove from server
      await api.post("/notifications/push/unsubscribe", { endpoint: sub.endpoint })

      setState("unsubscribed")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to unsubscribe"
      setError(msg)
      console.error("[push] unsubscribe error:", err)
    }
  }, [])

  return { state, error, subscribe, unsubscribe }
}
