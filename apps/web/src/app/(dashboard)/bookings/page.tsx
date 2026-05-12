import { redirect } from "next/navigation"

/**
 * /bookings has historically been a typo'd or copy-pasted shortcut for the
 * configuration page, which actually lives at /booking-settings. Redirect so
 * the URL doesn't 404.
 */
export default function BookingsRedirect() {
    redirect("/booking-settings")
}
