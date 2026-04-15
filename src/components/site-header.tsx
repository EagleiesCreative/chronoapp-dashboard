"use client"

import { usePathname } from "next/navigation"
import { Search, Bell, CircleUser, FileText } from "lucide-react"

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/booths": "Booth Management",
  "/dashboard/device-status": "Device Status",
  "/dashboard/gallery": "Gallery",
  "/dashboard/analytics": "Analytics",
  "/dashboard/reports": "Reports",
  "/dashboard/payments": "Payments",
  "/dashboard/settings": "Settings",
  "/dashboard/billing": "Billing",
  "/dashboard/support": "Support",
  "/dashboard/help": "Get Help",
}
import { ThemeSwitch } from "@/components/ThemeSwitch"

export function SiteHeader() {
  const pathname = usePathname()
  const title = routeTitles[pathname] || "Dashboard"
  
  const today = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 lg:px-9">
      {/* Left side: Page Title & Date */}
      <div className="flex flex-col justify-center">
        <h1 className="font-sans text-xl tracking-wide text-foreground font-light">{title}</h1>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
          {today}
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 bg-card border border-border px-4 py-2 w-56 transition-colors focus-within:border-primary/40">
          <Search className="size-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="bg-transparent border-none outline-none font-mono text-xs text-foreground w-full placeholder:text-muted-foreground"
          />
        </div>

        <ThemeSwitch />

        <button className="relative flex size-9 items-center justify-center bg-card border border-border transition-colors hover:border-muted-foreground group">
          <Bell className="size-[15px] text-muted-foreground stroke-[1.5]" />
          <span className="absolute top-[7px] right-[7px] size-[5px] rounded-full bg-primary" />
        </button>

        <button className="flex size-9 items-center justify-center bg-card border border-border transition-colors hover:border-muted-foreground">
          <CircleUser className="size-[15px] text-muted-foreground stroke-[1.5]" />
        </button>

        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent2"
        >
          <FileText className="size-3.5 stroke-2" />
          Generate Report
        </button>
      </div>
    </header>
  )
}
