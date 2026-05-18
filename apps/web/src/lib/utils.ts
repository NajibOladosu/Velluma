import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Format a date or YYYY-MM-DD string using the workspace's chosen pattern.
 * Supported tokens match the Settings → Workspace presets:
 *   "MMM d, yyyy"  → Mar 14, 2026
 *   "d MMM yyyy"   → 14 Mar 2026
 *   "yyyy-MM-dd"   → 2026-03-14
 *   "MM/dd/yyyy"   → 03/14/2026
 * Falls back to ISO "yyyy-MM-dd" if the pattern is unknown.
 */
export function formatWorkspaceDate(
    input: string | Date | null | undefined,
    pattern: string = "MMM d, yyyy",
): string {
    if (!input) return "";
    const date =
        typeof input === "string"
            ? input.length === 10
                ? new Date(`${input}T00:00:00`)
                : new Date(input)
            : input;
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const day = date.getDate();
    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");

    switch (pattern) {
        case "MMM d, yyyy":
            return `${MONTHS_SHORT[monthIndex]} ${day}, ${year}`;
        case "d MMM yyyy":
            return `${day} ${MONTHS_SHORT[monthIndex]} ${year}`;
        case "yyyy-MM-dd":
            return `${year}-${mm}-${dd}`;
        case "MM/dd/yyyy":
            return `${mm}/${dd}/${year}`;
        default:
            return `${year}-${mm}-${dd}`;
    }
}
