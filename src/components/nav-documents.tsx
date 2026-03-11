import { usePathname } from "next/navigation"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: Icon
  }[]
}) {
  const pathname = usePathname()

  const isActive = (itemUrl: string) => {
    if (itemUrl === "#") return false
    return pathname.startsWith(itemUrl)
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-muted-foreground px-6 py-2 pb-2 h-auto">Transactions</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton 
              asChild
              tooltip={item.name}
              isActive={isActive(item.url)}
              className="w-full flex items-center gap-3 px-6 py-2.5 h-auto rounded-none relative font-mono text-xs tracking-[0.06em] text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-foreground data-[active=true]:font-normal before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-5 before:bg-primary before:opacity-0 data-[active=true]:before:opacity-100"
            >
              <a href={item.url}>
                <item.icon className="size-[15px] stroke-[1.5]" />
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
