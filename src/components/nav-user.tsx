"use client"

import { useUser, SignOutButton, useClerk } from "@clerk/nextjs"
import * as React from "react"
import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const ROLE_KEY = 'chrono:userRole'
const ROLE_TS_KEY = 'chrono:userRoleTS'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user } = useUser()
  const { openUserProfile } = useClerk()

  // Clear cached role on sign-out to avoid stale role being used across sessions
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.imageUrl} alt={user.fullName || user.emailAddresses[0]?.emailAddress || ''} />
                <AvatarFallback className="rounded-lg">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.emailAddresses[0]?.emailAddress}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.imageUrl} alt={user.fullName || user.emailAddresses[0]?.emailAddress || ''} />
                  <AvatarFallback className="rounded-lg">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleAccountClick}>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <SignOutButton>
                <button className="flex w-full items-center">
                  <IconLogout />
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
