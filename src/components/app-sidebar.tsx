"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconFileDescription,
  IconFileAi,
  IconCamera,
  IconHeadset,
  IconHelp,
  IconInnerShadowTop,
  IconPhoto,
  IconReport,
  IconSearch,
  IconSettings,
  IconCreditCard,
  IconDeviceDesktop,
  IconListDetails,
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
      title: "Device Status",
      url: "/dashboard/device-status",
      icon: IconDeviceDesktop,
    },
    {
      title: "Gallery",
      url: "/dashboard/gallery",
      icon: IconPhoto,
    },
    {
      title: "Frames",
      url: "/dashboard/frames",
      icon: IconInnerShadowTop,
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
      title: "Billing",
      url: "/dashboard/billing",
      icon: IconCreditCard,
    },
    {
      title: "Support",
      url: "/dashboard/support",
      icon: IconHeadset,
    },
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  transactions: [
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar" {...props}>
      <SidebarHeader className="bg-sidebar border-b border-sidebar-border p-[24px] pt-[28px]">
        <a href="#" className="font-serif text-[1.4rem] font-light tracking-[0.08em] text-foreground leading-none">
          Fram<span className="text-primary italic">r</span>
        </a>
        <div className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-muted-foreground mt-[2px]">
          Studio Platform
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.transactions} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
