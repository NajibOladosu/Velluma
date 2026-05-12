"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// TODO(re-enable): ReactQueryDevtools floating panel intercepted clicks on
// some lower-right buttons. Disabled per user request 2026-05-12. Re-enable
// when devtools UX is needed again — import + render `<ReactQueryDevtools
// initialIsOpen={false} />` at the bottom of QueryClientProvider.
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = React.useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        retry: 1,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
    )
}
