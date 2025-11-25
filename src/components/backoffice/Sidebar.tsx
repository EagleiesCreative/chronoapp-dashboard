"use client"

import Link from "next/link"
import { Sidebar as IconSidebar, Home, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-white p-4 dark:bg-[#0b0b0b] md:flex">
      <div className="flex items-center gap-2 px-2">
        <IconSidebar className="size-6" />
        <h2 className="text-lg font-semibold">ChronoSnap</h2>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-2">
        <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent">
          <Home className="size-4" />
          Dashboard
        </Link>
        <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent">
          <Settings className="size-4" />
          Settings
        </Link>
      </nav>

      <div className="px-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="#" className="flex items-center gap-2">
            <LogOut className="size-4" />
            Sign out
          </a>
        </Button>
      </div>
    </aside>
  )
}
