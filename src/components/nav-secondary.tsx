"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()

  const isActive = (itemUrl: string) => {
    if (itemUrl === "#") return false
    return pathname.startsWith(itemUrl)
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarGroupLabel className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-muted-foreground px-6 py-2 pb-2 h-auto">Account</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild
                tooltip={item.title}
                isActive={isActive(item.url)}
                className="w-full flex items-center gap-3 px-6 py-2.5 h-auto rounded-none relative font-sans text-[13px] tracking-wider text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-foreground data-[active=true]:font-normal before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-5 before:bg-primary before:opacity-0 data-[active=true]:before:opacity-100"
              >
                <a href={item.url}>
                  <item.icon className="size-[15px] stroke-[1.5]" />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
