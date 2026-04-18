"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"
import { useUser, useClerk } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings as SettingsIcon } from "lucide-react"

const navItems = {
  OVERVIEW: [
    { label: "Dashboard", href: "/dashboard", icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" },
    { label: "Booth Management", href: "/dashboard/booths", icon: "M2 5a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5zm0 3h12" },
    { label: "Device Status", href: "/dashboard/device-status", icon: "M8 2a6 6 0 100 12A6 6 0 008 2zm0 3v3l2 1" },
    { label: "Gallery", href: "/dashboard/gallery", icon: "M2 3h12v10H2z M2 8h12" },
    { label: "Frames", href: "/dashboard/frames", icon: "M3 3h10v10H3z M5 5h6v6H5z" },
  ],
  TRANSACTIONS: [
    { label: "Analytics", href: "/dashboard/analytics", icon: "M2 12l3-5 3 3 2-3 4 5" },
    { label: "Reports", href: "/dashboard/reports", icon: "M3 4h10M3 7h7M3 10h5" },
    { label: "Payments", href: "/dashboard/payments", icon: "M2 5h12v8H2zM2 8h12" },
  ],
  ACCOUNT: [
    { label: "Settings", href: "/dashboard/settings", icon: "M8 5a3 3 0 100 6 3 3 0 000-6zM2 8h1M13 8h1M8 2v1M8 13v1" },
    { label: "Billing", href: "/dashboard/billing", icon: "M2 4h12v10H2zM2 8h12" },
    { label: "Support", href: "/dashboard/support", icon: "M8 2a6 6 0 100 12A6 6 0 008 2zm0 4v2M8 10v.5" },
  ],
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const { user } = useUser()
  const { signOut } = useClerk()
  const isOpen = state === "expanded"
  
  const widthClass = isOpen ? "w-[220px] min-w-[220px]" : "w-0 min-w-0"

  const checkActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const initials = user?.firstName 
    ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}`.toUpperCase()
    : 'DK'

  return (
    <aside 
      className={`overflow-hidden border-r border-[#ede9e3] bg-[#fff] flex flex-col transition-[width,min-width] duration-200 ease-in-out shrink-0 ${widthClass}`}
    >
      <div className="px-5 pt-[22px] pb-[18px] border-b border-[#f0ece6]">
        <div className="text-[18px] font-semibold tracking-[-0.5px] text-[#1a1a18]">Framr</div>
        <div className="text-[10px] tracking-[0.1em] uppercase text-[#b0a898] mt-[2px]">Studio Platform</div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-3 no-scrollbar">
        {Object.entries(navItems).map(([section, items]) => (
          <div key={section} className="mb-2">
            <div className="px-4 py-1 pb-1 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#c0b8ac]">
              {section}
            </div>
            {items.map(item => {
              const active = checkActive(item.href)
              return (
                <Link 
                  key={item.label} 
                  href={item.href}
                  className={`flex items-center gap-[9px] px-4 py-2 mx-2 my-[1px] rounded-lg text-[13.5px] font-${active ? 'medium' : 'normal'} transition-colors ${
                    active 
                      ? 'text-[#2d1f10] bg-[#f5f0ea]' 
                      : 'text-[#6b6358] bg-transparent hover:bg-[#f8f5f1]'
                  }`}
                >
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 16 16" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={active ? 'opacity-100' : 'opacity-50'}
                  >
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-[#f0ece6]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-[9px] p-2 rounded-lg cursor-pointer bg-transparent hover:bg-[#f8f5f1] transition-colors text-left border-none outline-none">
              <div className="w-[30px] h-[30px] rounded-full bg-[#e8ddd0] flex items-center justify-center text-[11px] font-semibold text-[#7a6050] shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-[12.5px] font-medium text-[#1a1a18] truncate">
                  {user?.fullName || 'danielkris'}
                </div>
                <div className="text-[11px] text-[#b0a898] truncate">Studio plan</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]" sideOffset={12}>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 focus:text-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
