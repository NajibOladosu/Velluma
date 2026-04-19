import { cookies } from "next/headers"
import { createServiceClient } from "@/utils/supabase/server"
import { PORTAL_SESSION_COOKIE, verifyPortalSession } from "@/lib/portal/session"

interface Branding {
    logoUrl: string | null
    coverUrl: string | null
    accentHex: string
    tagline: string | null
    workspaceName: string | null
}

async function loadBranding(): Promise<Branding | null> {
    const store = await cookies()
    const raw = store.get(PORTAL_SESSION_COOKIE)?.value
    const session = await verifyPortalSession(raw)
    const firstContract = session?.engagements.find(e => e.type === "contract")?.id
    if (!firstContract) return null

    const supabase = await createServiceClient()
    const { data: contract } = await supabase
        .from("contracts")
        .select("freelancer_id, creator_id")
        .eq("id", firstContract)
        .maybeSingle()
    const freelancerId = contract?.freelancer_id ?? contract?.creator_id
    if (!freelancerId) return null

    const { data: u } = await supabase.auth.admin.getUserById(freelancerId)
    const meta = (u.user?.user_metadata ?? {}) as Record<string, unknown>
    const b = (meta.branding ?? {}) as Record<string, string | null>
    return {
        logoUrl: b.logo_url ?? null,
        coverUrl: b.cover_url ?? null,
        accentHex: b.accent_hex ?? "#18181b",
        tagline: b.tagline ?? null,
        workspaceName: (meta.workspace_name as string | null) ?? (meta.full_name as string | null) ?? null,
    }
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const branding = await loadBranding()
    const accent = branding?.accentHex ?? "#18181b"

    return (
        <div
            className="min-h-screen bg-zinc-50 selection:bg-zinc-900 selection:text-white"
            style={{ ["--portal-accent" as string]: accent }}
        >
            {branding?.coverUrl && (
                <div
                    className="h-40 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${branding.coverUrl})` }}
                    aria-hidden
                />
            )}
            <main className="mx-auto max-w-4xl px-6 py-12">
                {(branding?.logoUrl || branding?.workspaceName) && (
                    <div className="flex items-center gap-3 mb-6">
                        {branding?.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={branding.logoUrl}
                                alt={branding.workspaceName ?? "Logo"}
                                className="h-9 w-9 rounded-md object-cover bg-white border border-zinc-200"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-md bg-zinc-900 flex-shrink-0" />
                        )}
                        {(branding?.workspaceName || branding?.tagline) && (
                            <div className="min-w-0">
                                {branding?.workspaceName && (
                                    <div className="text-sm font-semibold text-zinc-900 truncate">
                                        {branding.workspaceName}
                                    </div>
                                )}
                                {branding?.tagline && (
                                    <div className="text-xs text-zinc-500 truncate">{branding.tagline}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <div className="bg-white border border-zinc-200 rounded-lg p-10 min-h-[80vh]">
                    {children}
                </div>
            </main>
        </div>
    )
}
