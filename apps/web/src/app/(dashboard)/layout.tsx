import { AppSidebar } from "@/components/ui/app-sidebar";
import { AppTopBar } from "@/components/ui/app-topbar";
import { GlobalTimer } from "@/components/ui/global-timer";
import { CommandPalette } from "@/components/ui/command-palette";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-zinc-50">
            <AppSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <AppTopBar />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
            <GlobalTimer />
            <CommandPalette />
        </div>
    );
}
