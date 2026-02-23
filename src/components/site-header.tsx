"use client"

import { Bell } from "lucide-react"
import { usePathname } from "next/navigation"

import { ThemeSwitch } from "@/components/ThemeSwitch"

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/booths": "Booth Management",
  "/dashboard/members": "Members",
  "/dashboard/devices": "Device Status",
  "/dashboard/gallery": "Gallery",
  "/dashboard/analytics": "Analytics",
  "/dashboard/reports": "Reports",
  "/dashboard/payments": "Payments",
  "/dashboard/settings": "Settings",
  "/dashboard/broadcast": "Broadcast",
  "/dashboard/help": "Help Center",
  "/dashboard/billing": "Billing & Subscription",
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = routeTitles[pathname] || "Dashboard"

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 text-foreground lg:px-8">
      {/* Left side: Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <div className="flex size-7 items-center justify-center rounded bg-primary-500 text-primary-foreground">
            P
          </div>
          <span>Photolab</span>
        </div>
      </div>

      <div className="ml-4 flex flex-1 items-center gap-2">
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-3">
        <ThemeSwitch />
        <button
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary-500" />
        </button>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-600">
          Account
        </button>
      </div>
    </header>
  )
}

