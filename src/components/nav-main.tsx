"use client"

import { usePathname } from "next/navigation"
import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"
import { useState, useEffect } from "react"


import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  isAdmin,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
  isAdmin?: boolean
}) {
  const pathname = usePathname()

  const isActive = (itemUrl: string) => {
    if (itemUrl === "#") return false
    if (itemUrl === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(itemUrl)
  }

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/broadcast/unread')
        const data = await res.json()
        if (data.count) {
          setUnreadCount(data.count)
        }
      } catch (error) {
        console.error('Failed to fetch unread broadcasts:', error)
      }
    }
    fetchUnread()
  }, [])

  const handleQuickCreate = async () => {
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      if (data.invoice_url) {
        window.open(data.invoice_url, '_blank')
      }
    } catch (error) {
      console.error('Quick create error:', error)
      // You might want to add a toast here if you have a toast component available
      // toast.error('Failed to create payment')
      alert('Failed to create payment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu className="mb-4">
          <SidebarMenuItem className="px-6 mb-2">
            <button
              onClick={handleQuickCreate}
              className="flex w-full items-center gap-3 px-0 py-2.5 font-sans text-xs tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-[15px] stroke-current fill-none stroke-[1.5]"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Quick Create
            </button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarGroupLabel className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-muted-foreground px-6 py-2 pb-2 h-auto">Overview</SidebarGroupLabel>
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
                  {item.icon && <item.icon className="size-[15px] stroke-[1.5]" />}
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

