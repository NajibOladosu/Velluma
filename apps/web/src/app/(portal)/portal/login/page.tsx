/**
 * Clients no longer sign in to the portal — they receive a share link from
 * the freelancer they're working with. This page exists only to redirect
 * stale /portal/login URLs to the explainer.
 */
import { redirect } from "next/navigation"

export default function PortalLoginPage() {
  redirect("/portal/unavailable?reason=no-session")
}
