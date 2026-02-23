"use client"

import { Wifi, CreditCard } from "lucide-react"
import { spendingSegments, spendingTotal, creditCard } from "@/data/dashboard-data"

function SpendingBar() {
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-xs text-gray-400">Bounce Rate</p>
                    <p className="text-lg font-bold text-gray-950">85% <span className="text-xs text-secondary-500 ml-1">↗</span></p>
                </div>
                <div>
                    <p className="text-xs text-gray-400">Total Kiosk</p>
                    <p className="text-lg font-bold text-gray-950">3 Kiosk</p>
                </div>
            </div>

            {/* Segmented bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full mt-4">
                {spendingSegments.map((seg) => (
                    <div
                        key={seg.label}
                        className={`${seg.colorClass} transition-all duration-250`}
                        style={{ width: `${seg.percentage}%` }}
                    />
                ))}
            </div>
        </div>
    )
}

export function SpendingLimitsCard({ stats, loading }: { stats?: any, loading?: boolean }) {
    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full animate-pulse">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="mt-6 h-12 w-full bg-muted rounded" />
                <div className="mt-8 h-4 w-full bg-muted rounded" />
            </div>
        )
    }

    const total = (stats?.paidCount || 0) + (stats?.pendingCount || 0) + (stats?.expiredCount || 0) || 1
    const paidPct = Math.round(((stats?.paidCount || 0) / total) * 100)
    const pendingPct = Math.round(((stats?.pendingCount || 0) / total) * 100)
    const expiredPct = Math.round(((stats?.expiredCount || 0) / total) * 100)

    const segments = [
        { label: "Paid", count: stats?.paidCount || 0, percentage: paidPct, colorClass: "bg-primary-500" },
        { label: "Pending", count: stats?.pendingCount || 0, percentage: pendingPct, colorClass: "bg-secondary-500" },
        { label: "Expired/Failed", count: stats?.expiredCount || 0, percentage: expiredPct, colorClass: "bg-gray-400" },
    ]

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col">
            <p className="text-[0.8125rem] font-medium tracking-wide text-muted-foreground uppercase">
                Payment Distribution
            </p>
            <div className="mt-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Paid Transactions</p>
                        <p className="text-lg font-bold text-foreground">{stats?.paidCount || 0}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total Valid</p>
                        <p className="text-lg font-bold text-foreground">{stats?.totalTransactions || 0}</p>
                    </div>
                </div>

                {/* Segmented bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full mt-4 bg-muted">
                    {segments.map((seg) => (
                        <div
                            key={seg.label}
                            className={`${seg.colorClass} transition-all duration-500`}
                            style={{ width: `${seg.percentage}%` }}
                            title={`${seg.label}: ${seg.count}`}
                        />
                    ))}
                </div>

                {/* Dynamic Legend */}
                <div className="mt-6 border-t border-border pt-5 flex flex-wrap gap-4 text-xs font-medium">
                    {segments.map(seg => (
                        <div key={seg.label} className="flex items-center gap-1.5">
                            <span className={`size-2.5 rounded-full ${seg.colorClass}`} />
                            <span className="text-foreground">{seg.label}</span>
                            <span className="text-muted-foreground">({seg.percentage}%)</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
