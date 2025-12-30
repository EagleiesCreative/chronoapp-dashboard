"use client"

import * as React from "react"
import { useOrganization, OrganizationSwitcher } from "@clerk/nextjs"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconPhoto,
  IconReport,
  IconSearch,
  IconSettings,
  IconCreditCard,
  IconUsers,
  IconDeviceDesktop,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Booth Management",
      url: "/dashboard/booths",
      icon: IconListDetails,
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Members",
      url: "/dashboard/members",
      icon: IconUsers,
    },
    {
      title: "Device Status",
      url: "/dashboard/device-status",
      icon: IconDeviceDesktop,
    },
    {
      title: "Gallery",
      url: "/dashboard/gallery",
      icon: IconPhoto,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Analytics",
      url: "/dashboard/analytics",
      icon: IconChartBar,
    },
    {
      name: "Reports",
      url: "/dashboard/reports",
      icon: IconReport,
    },
    {
      name: "Payments",
      url: "/dashboard/payments",
      icon: IconCreditCard,
    },
  ],
}

const ROLE_TTL_MS = 30 * 60 * 1000
const ROLE_KEY = 'chrono:userRole'
const ROLE_TS_KEY = 'chrono:userRoleTS'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { membership } = useOrganization()

  // Avoid reading localStorage during initial render to prevent hydration
  // mismatch between server and client. Initialize as null and read on mount.
  const [cachedRole, setCachedRole] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)

  // Read cached role from localStorage only after client mount and respect TTL
  React.useEffect(() => {
    setMounted(true)

    try {
      const stored = localStorage.getItem(ROLE_KEY)
      const ts = localStorage.getItem(ROLE_TS_KEY)

      if (stored && ts) {
        const age = Date.now() - Number(ts)
        if (!isNaN(age) && age < ROLE_TTL_MS) {
          setCachedRole(stored)
        } else {
          // expired
          localStorage.removeItem(ROLE_KEY)
          localStorage.removeItem(ROLE_TS_KEY)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Keep local cache in sync with membership when it becomes available
  React.useEffect(() => {
    if (membership?.role) {
      try {
        localStorage.setItem(ROLE_KEY, membership.role)
        localStorage.setItem(ROLE_TS_KEY, Date.now().toString())
      } catch {
        // ignore
      }
      setCachedRole(membership.role)
    }
    // If membership is explicitly null (signed out), clear cache
    if (membership === null) {
      try {
        localStorage.removeItem(ROLE_KEY)
        localStorage.removeItem(ROLE_TS_KEY)
      } catch {
        // ignore
      }
      setCachedRole(null)
    }
  }, [membership])

  // Use cached role only after mount to match server-rendered HTML.
  const role = membership?.role ?? (mounted ? cachedRole : null)
  const isAdmin = role === "org:admin"

  // Filter nav items based on role - hide Members for non-admins
  const filteredNavMain = data.navMain.filter(item => {
    if (item.title === "Members") {
      return isAdmin
    }
    return true
  })

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5 hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <OrganizationSwitcher
                  hidePersonal
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      organizationSwitcherTrigger: "w-full flex items-center gap-2 p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      organizationPreviewTextContainer: "flex-1 truncate text-left",
                      organizationPreviewAvatarBox: "size-5 shrink-0",
                      organizationSwitcherPopoverActionButton: !isAdmin ? "hidden" : undefined
                    }
                  }}
                />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {mounted ? (
          <>
            <NavMain items={filteredNavMain} isAdmin={isAdmin} />
            <NavDocuments items={data.documents} />
            <NavSecondary items={data.navSecondary} className="mt-auto" />
          </>
        ) : (
          // Lightweight server/client-matching placeholder to avoid hydration mismatch
          <div aria-hidden className="w-full">
            <ul className="flex w-full min-w-0 flex-col gap-1">
              {data.navMain.slice(0, 3).map((item) => (
                <li key={item.title} className="h-8 rounded-md bg-muted/40 my-1" />
              ))}
            </ul>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
