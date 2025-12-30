"use client"

import { usePathname } from "next/navigation"
import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"
import { useState, useEffect } from "react"


import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
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
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              onClick={handleQuickCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0 relative"
              variant="outline"
              asChild
            >
              <a href="/dashboard/broadcast">
                <IconMail />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
                )}
                <span className="sr-only">Broadcast</span>
              </a>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive(item.url)}
              >
                <a href={item.url}>
                  {item.icon && <item.icon />}
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

