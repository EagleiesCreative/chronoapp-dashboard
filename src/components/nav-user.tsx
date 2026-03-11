"use client"

import { useUser, SignOutButton, useClerk, useOrganization } from "@clerk/nextjs"
import * as React from "react"
import {
  IconCreditCard,
  IconUserCircle,
  IconLogout,
  IconNotification,
} from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const ROLE_KEY = 'chrono:userRole'
const ROLE_TS_KEY = 'chrono:userRoleTS'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user } = useUser()
  const { organization } = useOrganization()
  const { openUserProfile } = useClerk()

  React.useEffect(() => {
    if (!user) {
      try {
        localStorage.removeItem(ROLE_KEY)
        localStorage.removeItem(ROLE_TS_KEY)
      } catch {
        // ignore
      }
    }
  }, [user])

  if (!user) {
    return null
  }

  const handleAccountClick = () => {
    openUserProfile()
  }

  const displayName = organization?.name || user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || "Guest"
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full outline-none">
            <div className="flex items-center gap-2.5 px-5 py-3 cursor-pointer transition-colors hover:bg-primary/5 rounded-none border-t border-border">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 font-sans text-[0.9rem] font-medium text-primary">
                {initials}
              </div>
              <div className="flex flex-1 flex-col items-start min-w-0">
                <div className="font-mono text-[0.68rem] text-foreground truncate w-full text-left">
                  {displayName}
                </div>
                <div className="font-mono text-[0.58rem] tracking-[0.1em] uppercase text-primary/70 mt-[2px]">
                  Studio Plan
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-card border-border"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-3 py-2 text-left text-sm">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 font-sans text-[0.9rem] font-medium text-primary">
                  {initials}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-foreground">
                    {displayName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleAccountClick} className="cursor-pointer">
                <IconUserCircle className="mr-2 size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <IconCreditCard className="mr-2 size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <IconNotification className="mr-2 size-4" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem asChild className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
              <SignOutButton>
                <button className="flex w-full items-center">
                  <IconLogout className="mr-2 size-4" />
                  Log out
                </button>
              </SignOutButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
