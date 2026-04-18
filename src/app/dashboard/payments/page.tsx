"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { IconLoader } from "@tabler/icons-react"

export type Payment = {
    id: string
    xendit_id: string
    amount: number
    status: string
    payment_method: string
    created_at: string
}

interface PaymentData {
    payments: Payment[]
    count: number
    totalRevenue: number
    paidCount: number
    isAdmin: boolean
    userRevenueSharePercent: number
    netRevenue: number
    orgCut: number
    avgOrgPercent: number
    estimatedOrgEarnings: number
}

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID")

export default function PaymentsPage() {
    const { isLoaded: orgLoaded, organization, membership } = useOrganization()
    const { isLoaded: userLoaded, user } = useUser()
    
    // API State
    const [payments, setPayments] = useState<Payment[]>([])
    const [data, setData] = useState<PaymentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [xenditBalance, setXenditBalance] = useState<number | null>(null)
    const [balanceLoading, setBalanceLoading] = useState(true)

    // UI state
    const [filter, setFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("All")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const [selected, setSelected] = useState<Payment | null>(null)

    const statuses = ["All", "Paid", "Pending", "Failed"]

    const isAdmin = membership?.role === "org:admin"

    const fetchPayments = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/payments')
            const responseData = await res.json()
            if (responseData.payments) {
                // Keep all payments, filter locally on UI
                setPayments(responseData.payments)
            }
            setData(responseData)
        } catch (error) {
            console.error('Failed to fetch payments:', error)
            toast.error('Failed to fetch payments')
        } finally {
            setLoading(false)
        }
    }

    const fetchBalance = async () => {
        setBalanceLoading(true)
        try {
            const res = await fetch('/api/payments/balance')
            if (res.ok) {
                const balData = await res.json()
                setXenditBalance(balData.balance ?? null)
            } else {
                setXenditBalance(null)
            }
        } catch (err) {
            console.error('Error fetching Xendit balance:', err)
            setXenditBalance(null)
        } finally {
            setBalanceLoading(false)
        }
    }

    useEffect(() => {
        if (orgLoaded && userLoaded && organization && user) {
            fetchPayments()
            fetchBalance()
        }
    }, [orgLoaded, userLoaded, organization, user])

    if (!orgLoaded || !userLoaded) {
        return (
            <div className="flex h-screen items-center justify-center w-full p-4">
                <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!organization) {
        return (
            <div className="flex h-screen flex-col items-center justify-center w-full p-4">
                <h2 className="text-xl font-medium">No Organization</h2>
                <p className="text-sm text-gray-500 mt-2">Please select or create an organization to view payments.</p>
            </div>
        )
    }

    const filtered = payments
        .filter(t => {
            const normalizedStatus = t.status ? t.status.toLowerCase() : ""
            let checkStatus = statusFilter.toLowerCase()
            
            // Xendit status normalization (Settled = Paid)
            const matchStatus = statusFilter === "All" || normalizedStatus === checkStatus || (statusFilter === "Paid" && normalizedStatus === "settled")
            
            const matchSearch = t.xendit_id?.toLowerCase().includes(filter.toLowerCase()) ||
                t.payment_method?.toLowerCase().includes(filter.toLowerCase())
            return matchStatus && matchSearch
        })
        .sort((a, b) => sortDir === "desc" ? b.amount - a.amount : a.amount - b.amount)

    const totalPaid = payments.filter(t => t.status && (t.status.toUpperCase() === "PAID" || t.status.toUpperCase() === "SETTLED")).reduce((s, t) => s + t.amount, 0)
    const paidCount = payments.filter(t => t.status && (t.status.toUpperCase() === "PAID" || t.status.toUpperCase() === "SETTLED")).length

    const statusStyle = (s: string) => {
        const lower = s ? s.toLowerCase() : "pending"
        return {
            paid: { bg: "#dcfce7", color: "#15803d" },
            settled: { bg: "#dcfce7", color: "#15803d" },
            pending: { bg: "#fef9c3", color: "#a16207" },
            failed: { bg: "#fee2e2", color: "#dc2626" },
        }[lower] || { bg: "#f3f4f6", color: "#6b7280" }
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "#fafaf9", color: "#1a1a18", position: "relative" }}>
            <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
                {/* Page header */}
                <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px" }}>Payments</div>
                        <div style={{ fontSize: 13.5, color: "#9a9288", marginTop: 3 }}>
                            {isAdmin ? "Finance overview for your organization" : "Your recent payment transactions"}
                        </div>
                    </div>
                </div>

                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                    {[
                        { label: "Paid transactions", val: loading ? "..." : (data?.paidCount || paidCount), sub: "Successful payments", highlight: false },
                        { label: "Total revenue", val: loading ? "..." : fmt(data?.totalRevenue || totalPaid), sub: "From all paid transactions", highlight: false },
                        { label: "Xendit balance", val: balanceLoading ? "..." : xenditBalance === null ? "Error" : fmt(xenditBalance), sub: "Live from Xendit account", highlight: true },
                    ].map(c => (
                        <div key={c.label} style={{ background: c.highlight ? "#f0faf4" : "#fff", border: `1px solid ${c.highlight ? "#bbf7d0" : "#ede9e3"}`, borderRadius: 12, padding: "18px 20px" }}>
                            <div style={{ fontSize: 11.5, color: "#b0a898", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{c.label}</div>
                            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: c.highlight ? "#16a34a" : "#1a1a18" }}>{c.val}</div>
                            <div style={{ fontSize: 12, color: "#b0a898", marginTop: 5 }}>{c.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div style={{ background: "#fff", border: "1px solid #ede9e3", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0ece6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>Transaction history</div>
                            <div style={{ fontSize: 12.5, color: "#b0a898", marginTop: 2 }}>All payment transactions across your organization</div>
                        </div>
                        <button onClick={() => { fetchPayments(); fetchBalance() }} disabled={loading || balanceLoading} style={{ background: "transparent", border: "1px solid #ede9e3", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#1a1a18", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <IconLoader className={`h-3.5 w-3.5 ${loading || balanceLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {/* Toolbar */}
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0ece6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ display: "flex", gap: 4 }}>
                            {statuses.map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)} style={{ height: 28, padding: "0 12px", borderRadius: 6, border: statusFilter === s ? "1px solid #c8b89a" : "1px solid #ede9e3", background: statusFilter === s ? "#f5f0ea" : "transparent", color: statusFilter === s ? "#2d1f10" : "#9a9288", fontSize: 12.5, fontWeight: statusFilter === s ? 500 : 400, cursor: "pointer" }}>{s}</button>
                            ))}
                        </div>
                        <div style={{ position: "relative" }}>
                            <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L13 13" /></svg>
                            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter transactions…" style={{ paddingLeft: 28, paddingRight: 10, height: 30, width: 200, border: "1px solid #ede9e3", borderRadius: 7, fontSize: 12.5, background: "#faf8f5", outline: "none", color: "#1a1a18" }} />
                        </div>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #f0ece6" }}>
                                <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#b0a898", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase" }}>Status</th>
                                <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#b0a898", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase" }}>Transaction ID</th>
                                <th onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")} style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#b0a898", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", userSelect: "none" }}>
                                    Amount {sortDir === "desc" ? "↓" : "↑"}
                                </th>
                                <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#b0a898", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase" }}>Method</th>
                                <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#b0a898", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase" }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && payments.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#b0a898", fontSize: 13.5 }}>Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#b0a898", fontSize: 13.5 }}>No transactions match your filters.</td></tr>
                            ) : null}
                            {filtered.map(t => {
                                const ss = statusStyle(t.status)
                                const dt = new Date(t.created_at)
                                const dateStr = isNaN(dt.getTime()) ? t.created_at : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                const timeStr = isNaN(dt.getTime()) ? "" : dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
                                
                                return (
                                    <tr key={t.id}
                                        onClick={() => setSelected(selected?.id === t.id ? null : t)}
                                        style={{ borderBottom: "1px solid #f8f5f1", cursor: "pointer", background: selected?.id === t.id ? "#faf7f3" : "transparent", transition: "background 0.1s" }}
                                        onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.background = "#faf8f5" }}
                                        onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.background = "transparent" }}
                                    >
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 500, background: ss.bg, color: ss.color }}>
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: ss.color }} />
                                                {t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1).toLowerCase() : "Unknown"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#6b6358", background: "#f5f2ee", padding: "3px 7px", borderRadius: 5 }}>
                                                {t.xendit_id ? (t.xendit_id.length > 28 ? t.xendit_id.slice(0, 28) + "…" : t.xendit_id) : t.id.slice(0, 28) + "…"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: 13.5, fontWeight: 500, color: "#1a1a18" }}>{fmt(t.amount)}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6b6358", textTransform: "capitalize" }}>
                                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.5 }}><rect x="2" y="4" width="12" height="9" rx="1.5" /><path d="M2 7.5h12" /></svg>
                                                {t.payment_method ? t.payment_method.replace(/_/g, ' ').toLowerCase() : "Unknown"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#6b6358" }}>{dateStr}{timeStr && <>, <span style={{ color: "#b0a898" }}>{timeStr}</span></>}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    <div style={{ padding: "11px 16px", borderTop: "1px solid #f0ece6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12.5, color: "#b0a898" }}>Showing {filtered.length} of {payments.length} transactions</span>
                    </div>
                </div>
            </div>

            {/* Detail panel */}
            {selected && (
                <div style={{ width: 330, borderLeft: "1px solid #ede9e3", background: "#fff", padding: "20px", flexShrink: 0, overflowY: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>Transaction</div>
                        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b0a898", fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ width: "100%", height: 70, borderRadius: 10, background: "linear-gradient(135deg,#f5f0ea,#e8ddd0)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="7" width="22" height="14" rx="2.5" /><path d="M3 12h22" /></svg>
                    </div>
                    {[
                        { label: "Amount", val: fmt(selected.amount), big: true },
                        { label: "Status", val: selected.status ? selected.status.charAt(0).toUpperCase() + selected.status.slice(1).toLowerCase() : "Unknown" },
                        { label: "Transaction ID", val: selected.xendit_id || selected.id, mono: true, small: true },
                        { label: "Method", val: selected.payment_method ? selected.payment_method.replace(/_/g, ' ').toUpperCase() : "Unknown" },
                        { label: "Date", val: isNaN(new Date(selected.created_at).getTime()) ? selected.created_at : new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                    ].map(row => (
                        <div key={row.label} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10.5, color: "#b0a898", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{row.label}</div>
                            <div style={{ fontSize: row.big ? 18 : row.small ? 11.5 : 13.5, fontWeight: row.big ? 600 : 400, color: "#1a1a18", fontFamily: row.mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{row.val}</div>
                        </div>
                    ))}
                    
                    {/* Placeholder for receipt logic */}
                    <button style={{ width: "100%", height: 34, borderRadius: 8, background: "#2d1f10", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", marginTop: 8 }}>View Details</button>
                </div>
            )}
        </div>
    )
}
