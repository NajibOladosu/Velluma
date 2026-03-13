export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-zinc-50 selection:bg-zinc-900 selection:text-white">
            <main className="mx-auto max-w-4xl px-6 py-12">
                <div className="bg-white border border-zinc-200 rounded-lg p-10 min-h-[80vh]">
                    {children}
                </div>
            </main>
        </div>
    );
}
