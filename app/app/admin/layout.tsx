import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full bg-[#0F111A] text-white">
            {/* Sidebar - Hidden on mobile for now, focused on desktop */}
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
                <AdminSidebar />
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col md:pl-64 min-h-screen font-sans">
                <main className="flex-1 py-8">
                    <div className="px-4 sm:px-8 lg:px-12">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
