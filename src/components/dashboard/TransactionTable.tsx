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
    "Wire Transfer": "bg-info/15 text-info",
    "Bank Transfer": "bg-purple/15 text-purple",
    "QRIS": "bg-purple/15 text-purple",
}

const statusStyles: Record<string, { dot: string; text: string }> = {
    PAID: { dot: "bg-success", text: "text-success" },
    SETTLED: { dot: "bg-success", text: "text-success" },
    RECEIVED: { dot: "bg-success", text: "text-success" },
    EXPIRED: { dot: "bg-error", text: "text-error" },
    FAILED: { dot: "bg-error", text: "text-error" },
    PENDING: { dot: "bg-warning", text: "text-warning" },
}

function MethodBadge({ method }: { method: string }) {
    const style = methodStyles[method] || "bg-muted text-muted-foreground"
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
            {method}
        </span>
    )
}

function StatusBadge({ status }: { status: string }) {
    const defaultStyle = { dot: "bg-gray-400", text: "text-gray-500" }
    const style = statusStyles[status?.toUpperCase()] || defaultStyle
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
            <span className={`inline-block size-1.5 rounded-full ${style.dot}`} />
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
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

    // ── Handlers ──

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === displayedTransactions.length && displayedTransactions.length > 0) {
            setSelectedIds(newSet => {
                displayedTransactions.forEach(tx => newSet.delete(tx.id))
                return new Set(newSet)
            })
        } else {
            setSelectedIds(newSet => {
                displayedTransactions.forEach(tx => newSet.add(tx.id))
                return new Set(newSet)
            })
        }
    }

    return (
        <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Local transaction search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            placeholder="Search Transaction…"
                            className="h-9 w-48 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Date filter - Using a wrapper to style native input date */}
                    <div className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-primary-500">
                        <Calendar className="size-3.5 text-secondary-500 pointer-events-none" />
                        <span className="pointer-events-none whitespace-nowrap">
                            {dateFilter ? new Date(dateFilter).toLocaleDateString() : 'Processed Date'}
                        </span>
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
                                className="relative z-10 ml-1 rounded-full p-0.5 hover:bg-muted"
                            >
                                <ChevronDown className="size-3 text-gray-400 rotate-180" />
                            </button>
                        )}
                    </div>

                    {/* Status filter - styled select */}
                    <div className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-primary-500">
                        <select
                            title="Filter by Status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-transparent pl-3 pr-8 py-1.5 w-full h-full cursor-pointer focus:outline-none"
                        >
                            <option value="">More (All Statuses)</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="FAILED">Failed / Expired</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <table className="w-full min-w-[48rem] text-left">
                    <thead>
                        <tr className="border-b border-border bg-card">
                            <th className="w-10 py-3 pl-4 pr-2">
                                <input
                                    type="checkbox"
                                    checked={displayedTransactions.length > 0 && displayedTransactions.every(tx => selectedIds.has(tx.id))}
                                    ref={input => {
                                        if (input) {
                                            const someSelected = displayedTransactions.some(tx => selectedIds.has(tx.id));
                                            const allSelected = displayedTransactions.length > 0 && displayedTransactions.every(tx => selectedIds.has(tx.id));
                                            input.indeterminate = someSelected && !allSelected;
                                        }
                                    }}
                                    onChange={toggleSelectAll}
                                    className="size-4 rounded border-gray-300 accent-primary-500"
                                    aria-label="Select all displayed"
                                />
                            </th>
                            <th className="px-3 py-3 text-[0.8125rem] font-medium text-muted-foreground">
                                Payment ID
                            </th>
                            <th className="px-3 py-3 text-[0.8125rem] font-medium text-muted-foreground">
                                Total Amount
                            </th>
                            <th className="px-3 py-3 text-[0.8125rem] font-medium text-muted-foreground">
                                To
                            </th>
                            <th className="px-3 py-3 text-[0.8125rem] font-medium text-muted-foreground">
                                Payment Method
                            </th>
                            <th className="px-3 py-3 text-[0.8125rem] font-medium text-muted-foreground">
                                Processed Date
                            </th>
                            <th className="px-3 py-3 text-[0.8125rem] font-medium text-muted-foreground">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && displayedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                                    <Loader2 className="mx-auto size-6 animate-spin" />
                                </td>
                            </tr>
                        ) : displayedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                                    No transactions found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            displayedTransactions.map((tx) => {
                                const isSelected = selectedIds.has(tx.id)
                                return (
                                    <tr
                                        key={tx.id}
                                        className={`transition-colors duration-150 border-none hover:bg-accent ${isSelected ? 'bg-primary/5' : 'odd:bg-card even:bg-secondary-50 dark:even:bg-accent'}`}
                                    >
                                        <td className="py-3 pl-4 pr-2">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelection(tx.id)}
                                                className="size-4 rounded border-border accent-primary-400"
                                                aria-label={`Select ${tx.external_id}`}
                                            />
                                        </td>
                                        <td className="px-3 py-3 font-mono text-sm text-foreground">
                                            {tx.external_id || "N/A"}
                                        </td>
                                        <td className="px-3 py-3 text-sm font-medium text-foreground">{formatCurrency(tx.amount)}</td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2">
                                                <Avatar initials="GU" />
                                                <span className="text-sm text-foreground">Guest User</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <MethodBadge method={tx.payment_method || "QRIS"} />
                                        </td>
                                        <td className="px-3 py-3 text-sm text-foreground">
                                            {formatDate(tx.created)}
                                            <span className="text-xs text-muted-foreground ml-2 block sm:inline">
                                                {new Date(tx.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusBadge status={tx.status} />
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
