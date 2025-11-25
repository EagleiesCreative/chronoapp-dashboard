"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as Dialog from "@radix-ui/react-dialog"
import MobileSidebar from "./MobileSidebar"

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b bg-white p-4 dark:bg-[#0b0b0b]">
      <div className="flex items-center gap-2">
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <button aria-label="Open menu">
                <Menu className="size-5" />
              </button>
            </Button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
            <Dialog.Content className="fixed left-0 top-0 z-50 h-full w-full max-w-xs">
              <MobileSidebar />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">christina@example.com</div>
        <Button variant="outline" size="sm">Account</Button>
      </div>
    </header>
  )
}
