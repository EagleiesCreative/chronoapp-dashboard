"use client"

import { useState, useMemo, useRef } from "react"
import {
    Search,
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Loader2
} from "lucide-react"
import { toast } from "sonner"

// ── Badge helpers ──

const methodStyles: Record<string, string> = {
    "Wire Transfer": "bg-info/10 text-info border border-info/20",
    "Bank Transfer": "bg-purple/10 text-purple border border-purple/20",
    "QRIS": "bg-purple/10 text-purple border border-purple/20",
}

const statusStyles: Record<string, string> = {
    PAID: "bg-primary/10 text-primary border border-primary/20",
    SETTLED: "bg-primary/10 text-primary border border-primary/20",
    RECEIVED: "bg-primary/10 text-primary border border-primary/20",
    EXPIRED: "bg-error/10 text-error border border-error/20",
    FAILED: "bg-error/10 text-error border border-error/20",
    PENDING: "bg-[#ffab00]/10 text-[#ffab00] border border-[#ffab00]/20",
}

const dotStyles: Record<string, string> = {
    PAID: "bg-primary shadow-[0_0_8px_rgba(0,221,99,0.8)] animate-[pulse-dot_2s_infinite]",
    SETTLED: "bg-primary shadow-[0_0_8px_rgba(0,221,99,0.8)] animate-[pulse-dot_2s_infinite]",
    RECEIVED: "bg-primary shadow-[0_0_8px_rgba(0,221,99,0.8)] animate-[pulse-dot_2s_infinite]",
    EXPIRED: "bg-error shadow-[0_0_8px_rgba(255,82,82,0.8)]",
    FAILED: "bg-error shadow-[0_0_8px_rgba(255,82,82,0.8)]",
    PENDING: "bg-[#ffab00] shadow-[0_0_8px_rgba(255,171,0,0.8)] animate-[pulse-dot-pending_2s_infinite]",
}

function MethodBadge({ method }: { method: string }) {
    const style = methodStyles[method] || "bg-muted text-muted-foreground border border-border"
    return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] ${style}`}>
            {method}
        </span>
    )
}

function StatusBadge({ status }: { status: string }) {
    const key = status?.toUpperCase() || ''
    const badgeClass = statusStyles[key] || "bg-muted text-muted-foreground border border-border"
    const dotClass = dotStyles[key] || "bg-gray-400"
    
    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-[0.1em] ${badgeClass}`}>
            <span className={`size-1.5 rounded-full ${dotClass}`} />
            {status}
        </span>
    )
}

function Avatar({ initials }: { initials: string }) {
    return (
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[0.625rem] font-medium text-accent-foreground">
            {initials}
        </span>
    )
}

// ── Pagination ──

function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    entriesPerPage,
    totalEntries,
    showAll,
    onToggleShowAll
}: {
    currentPage: number
    totalPages: number
    onPageChange: (p: number) => void
    entriesPerPage: number
    totalEntries: number
    showAll: boolean
    onToggleShowAll: () => void
}) {
    const pages: (number | "ellipsis")[] = []
    for (let i = 1; i <= Math.min(3, totalPages); i++) pages.push(i)
    if (totalPages > 4) pages.push("ellipsis")
    if (totalPages > 3) pages.push(totalPages)

    return (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || totalPages === 0 || showAll}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="size-4" />
                </button>
                {!showAll && pages.map((page, i) =>
                    page === "ellipsis" ? (
                        <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground">
                            …
                        </span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`inline-flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${currentPage === page
                                ? "bg-secondary-500 text-white"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            {page}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0 || showAll}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                    Showing {totalEntries > 0 ? (showAll ? 1 : (currentPage - 1) * entriesPerPage + 1) : 0} to {Math.min(showAll ? totalEntries : currentPage * entriesPerPage, totalEntries)} of {totalEntries} entries
                </span>
                <button
                    onClick={onToggleShowAll}
                    className="font-medium text-primary-400 hover:underline"
                >
                    {showAll ? "Show Paginated" : "Show All"}
                </button>
            </div>
        </div>
    )
}

// ── Main Component ──

interface TransactionTableProps {
    transactions?: any[]
    loading?: boolean
    globalSearch?: string
}

export function TransactionTable({ transactions = [], loading, globalSearch = "" }: TransactionTableProps) {
    const [currentPage, setCurrentPage] = useState(1)
    const [localSearch, setLocalSearch] = useState("")
    const [dateFilter, setDateFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [showAll, setShowAll] = useState(false)

    const entriesPerPage = 5

    // Unified filtering logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            // Priority 1: Global Search from ActionBar
            if (globalSearch) {
                const searchLower = globalSearch.toLowerCase()
                const matchesGlobal =
                    tx.external_id?.toLowerCase().includes(searchLower) ||
                    tx.payment_method?.toLowerCase().includes(searchLower) ||
                    tx.status?.toLowerCase().includes(searchLower)
                if (!matchesGlobal) return false
            }

            // Priority 2: Local Search
            if (localSearch) {
                const searchLower = localSearch.toLowerCase()
                const matchesLocal =
                    tx.external_id?.toLowerCase().includes(searchLower) ||
                    tx.payment_method?.toLowerCase().includes(searchLower)
                if (!matchesLocal) return false
            }

            // Priority 3: Date Filter (YYYY-MM-DD from input[type=date])
            if (dateFilter) {
                const txDate = new Date(tx.created).toISOString().split('T')[0]
                if (txDate !== dateFilter) return false
            }

            // Priority 4: Status Filter
            if (statusFilter && statusFilter !== "All") {
                if (tx.status?.toUpperCase() !== statusFilter.toUpperCase()) return false
            }

            return true
        })
    }, [transactions, globalSearch, localSearch, dateFilter, statusFilter])

    const totalEntries = filteredTransactions.length
    const totalPages = Math.ceil(totalEntries / entriesPerPage)

    const displayedTransactions = showAll
        ? filteredTransactions
        : filteredTransactions.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)
    }

    const formatDate = (dateString: string) => {
        const d = new Date(dateString)
        return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`
    }



    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-6">
                    <h2 className="font-sans text-[1.4rem] font-medium text-foreground tracking-wide">Recent Transactions</h2>
                    
                    {/* Filter Pills */}
                    <div className="hidden sm:flex items-center gap-2">
                        {/* Date filter - Using a wrapper to style native input date */}
                        <div className="relative inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card font-mono text-[0.6rem] tracking-[0.1em] uppercase text-muted-foreground cursor-pointer transition-colors hover:bg-muted/50 rounded-none">
                            <span className="pointer-events-none whitespace-nowrap">
                                {dateFilter ? new Date(dateFilter).toLocaleDateString() : 'Processed Date'}
                            </span>
                            <ChevronDown className="size-3 pointer-events-none" />
                            {/* Hidden native date input that completely overlaps the button */}
                            <input
                                type="date"
                                title="Filter by Processed Date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {/* Clear date button if active */}
                            {dateFilter && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setDateFilter("")
                                    }}
                                    className="absolute right-0 top-0 bottom-0 px-2 bg-card hover:bg-muted z-10 flex items-center justify-center border-l border-border"
                                >
                                    <ChevronDown className="size-3 text-muted-foreground rotate-180" />
                                </button>
                            )}
                        </div>

                        {/* Status filter - styled select */}
                        <div className="relative inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card font-mono text-[0.6rem] tracking-[0.1em] uppercase text-muted-foreground cursor-pointer transition-colors hover:bg-muted/50 rounded-none">
                            <select
                                title="Filter by Status"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none bg-transparent placeholder-muted-foreground text-muted-foreground pr-4 w-full h-full cursor-pointer focus:outline-none uppercase tracking-[0.1em]"
                            >
                                <option value="">Status</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="FAILED">Failed / Expired</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 size-3 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Search Box */}
                <div className="relative flex items-center gap-2.5 bg-card border border-border px-4 py-2 w-full sm:w-[220px] transition-colors focus-within:border-primary/40 rounded-none">
                    <Search className="size-[13px] text-muted-foreground shrink-0" />
                    <input
                        type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none font-mono text-[0.68rem] text-foreground placeholder:text-muted-foreground w-full"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto border border-border bg-card">
                <table className="w-full min-w-[48rem] text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-card">
                            <th className="px-6 py-4 font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground font-normal">
                                Payment ID
                            </th>
                            <th className="px-6 py-4 font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground font-normal">
                                Total Amount
                            </th>
                            <th className="px-6 py-4 font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground font-normal">
                                To
                            </th>
                            <th className="px-6 py-4 font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground font-normal">
                                Payment Method
                            </th>
                            <th className="px-6 py-4 font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground font-normal">
                                Processed Date
                            </th>
                            <th className="px-6 py-4 font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground font-normal">
                                Status
                            </th>
                            <th className="px-6 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && displayedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground bg-card">
                                    <Loader2 className="mx-auto size-6 animate-spin" />
                                </td>
                            </tr>
                        ) : displayedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center font-mono text-sm text-muted-foreground bg-card">
                                    No transactions found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            displayedTransactions.map((tx) => {
                                return (
                                    <tr
                                        key={tx.id}
                                        className="border-b border-border bg-card transition-colors duration-200 hover:bg-muted/10 last:border-0"
                                    >
                                        <td className="px-6 py-4 font-mono text-[0.65rem] text-foreground">
                                            {tx.external_id || "N/A"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-sans text-[1.05rem] font-medium leading-none tracking-wide text-foreground flex items-baseline">
                                                <span className="text-[0.65rem] text-muted-foreground font-light align-super mr-[2px]">Rp</span>
                                                {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(tx.amount || 0)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-sans font-medium text-[0.7rem] text-primary shrink-0">
                                                    G
                                                </div>
                                                <span className="font-sans text-[13px] tracking-wide text-foreground">Guest User</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[0.65rem] text-muted-foreground">
                                            {tx.payment_method || "QRIS"}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[0.65rem] text-foreground">
                                            {formatDate(tx.created)}
                                            <span className="text-muted-foreground ml-2">
                                                {new Date(tx.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={tx.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-1">
                                                <ChevronRight className="size-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                entriesPerPage={entriesPerPage}
                totalEntries={totalEntries}
                showAll={showAll}
                onToggleShowAll={() => setShowAll(!showAll)}
            />
        </div>
    )
}
