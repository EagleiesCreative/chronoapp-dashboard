import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Full-width Top Header (Photolab style) */}
      <SiteHeader />

      {/* Main Layout Area */}
      <SidebarProvider className="flex-1 overflow-hidden min-h-0">
        <AppSidebar />
        <SidebarInset className="bg-background overflow-y-auto">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
