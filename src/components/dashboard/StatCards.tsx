"use client"

import { Clock } from "lucide-react"

export function StatCards({ stats, loading }: { stats?: any, loading?: boolean }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-[120px] animate-pulse rounded-xl bg-muted" />
                ))}
            </div>
        )
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const cards = [
        { label: "Total Revenue", value: stats ? formatCurrency(stats.totalRevenue) : "Rp0" },
        { label: "Total Transactions", value: stats ? stats.totalTransactions.toString() : "0" },
        { label: "Success Rate", value: stats ? `${stats.successRate}%` : "0%" },
    ]

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                >
                    <p className="text-[0.8125rem] font-medium uppercase tracking-wide text-muted-foreground">
                        {card.label}
                    </p>
                    <p className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
                        {card.value}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-success">
                        <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success">
                            ↗ Realtime Data
                        </span>
                        <span className="text-muted-foreground">from connected booths</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
