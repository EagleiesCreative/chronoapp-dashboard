"use client"

import Link from "next/link"
import { X, Home, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogClose } from "@/components/ui/dialog"

export default function MobileSidebar() {
  return (
    <div className="h-full w-full max-w-xs bg-white p-4 dark:bg-[#0b0b0b]">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Home className="size-6" />
          <h2 className="text-lg font-semibold">ChronoSnap</h2>
        </div>
        <DialogClose className="rounded-md p-1 hover:bg-accent">
          <X className="size-5" />
        </DialogClose>
      </div>

      <nav className="mt-6 flex flex-col gap-2 px-2">
        <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent">
          <Home className="size-4" />
          Dashboard
        </Link>
        <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent">
          <Settings className="size-4" />
          Settings
        </Link>
      </nav>

      <div className="mt-6 px-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="#" className="flex items-center gap-2">
            <LogOut className="size-4" />
            Sign out
          </a>
        </Button>
      </div>
    </div>
  )
}
