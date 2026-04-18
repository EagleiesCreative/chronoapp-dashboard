"use client"

import { useSidebar } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="h-[54px] px-6 flex items-center justify-between border-b border-[#ede9e3] bg-[#fff] shrink-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar} 
          className="bg-transparent border-none cursor-pointer p-1 text-[#9a9288] flex items-center justify-center hover:text-[#1a1a18] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        </button>
        <div className="relative">
          <svg className="absolute left-[10px] top-1/2 -translate-y-1/2 opacity-40 text-[#1a1a18]" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L13 13" />
          </svg>
          <input 
            placeholder="Search anything…" 
            className="pl-[30px] pr-3 h-8 w-[230px] border border-[#ede9e3] rounded-lg text-[13px] bg-[#faf8f5] text-[#1a1a18] outline-none focus:border-[#c0b8ac] transition-colors placeholder:text-[#9a9288]" 
          />
        </div>
      </div>
      <button 
        onClick={() => window.print()}
        className="h-8 px-[13px] rounded-md border border-[#ede9e3] bg-[#fff] text-[13px] text-[#6b6358] cursor-pointer hover:bg-[#faf8f5] transition-colors font-medium"
      >
        Generate report
      </button>
    </div>
  )
}
