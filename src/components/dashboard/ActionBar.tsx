"use client"

import { FileBarChart, Download, Search } from "lucide-react"

interface ActionBarProps {
    onSearch: (term: string) => void
    searchTerm: string
    onGenerateReport: () => void
}

export function ActionBar({
    onSearch,
    searchTerm,
    onGenerateReport
}: ActionBarProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <button
                    onClick={onGenerateReport}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none"
                >
                    <FileBarChart className="size-4" />
                    Generate Report
                </button>
            </div>
            <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Search Anything…"
                    className="h-9 w-full rounded-lg border border-border bg-input pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>
        </div>
    )
}
