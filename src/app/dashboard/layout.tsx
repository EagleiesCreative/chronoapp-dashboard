import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use DM Sans/Helvetica Neue font family globally on this layout structure as requested
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafaf9] text-[#1a1a18] font-sans">
      <SidebarProvider className="w-full flex h-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full relative">
          <SiteHeader />
          <div className="flex-1 overflow-auto bg-[#fafaf9]">
            {children}
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}
