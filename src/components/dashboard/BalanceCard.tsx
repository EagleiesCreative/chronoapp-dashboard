"use client"

import { useState } from "react"
import { ArrowRight, Clock, MoreVertical } from "lucide-react"
import { balanceData, availableBalance } from "@/data/dashboard-data"
import { primary } from "@/data/config/colors"

type ViewMode = "line" | "bar"

export function BalanceCard({ chartData, stats, loading }: { chartData?: any[], stats?: any, loading?: boolean }) {
    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full animate-pulse">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="mt-4 flex gap-6">
                    <div className="h-10 w-24 bg-muted rounded" />
                    <div className="h-10 w-24 bg-muted rounded" />
                </div>
                <div className="mt-6 h-[220px] w-full bg-muted rounded" />
            </div>
        )
    }

    const data = chartData || []
    const maxValue = data.length > 0 ? Math.max(...data.map((d: any) => d.revenue)) : 1000

    const formatValue = (val: number) => {
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
        return `${val}`
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)
    }

    const formatDate = (dateString: string) => {
        const d = new Date(dateString)
        return `${d.getDate()}/${d.getMonth() + 1}`
    }

    // Process data to have max 14 data points for visual density, or skip labels
    let displayData = data
    if (data.length > 14) {
        // Just take last 14 days
        displayData = data.slice(-14)
    }

    const yTicks = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0]

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-[0.8125rem] font-medium tracking-wide text-muted-foreground uppercase">Revenue Over Time</p>
                    <div className="mt-2 flex items-center gap-6">
                        <div>
                            <p className="text-xs text-muted-foreground">Total Revenue</p>
                            <p className="font-bold text-foreground">{formatCurrency(stats?.totalRevenue)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Transactions</p>
                            <p className="font-bold text-foreground">{stats?.totalTransactions || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="mt-6 flex-1 flex flex-col justify-end">
                <div className="mt-4 flex gap-4 h-[220px]">
                    {/* Y-axis labels */}
                    <div className="flex flex-col justify-between pb-7 text-right w-8">
                        {yTicks.map((tick, i) => (
                            <span key={i} className="text-[10px] font-medium text-muted-foreground">
                                {formatValue(tick)}
                            </span>
                        ))}
                    </div>

                    {/* Approximate Area via dense bars for the CSS-only mock */}
                    <div className="flex flex-1 items-end gap-1 overflow-hidden relative border-b border-border">
                        {/* Faux Area Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-t from-primary-500/20 to-transparent pointer-events-none" />

                        {displayData.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 z-20">
                                No revenue data available
                            </div>
                        ) : (
                            displayData.map((point: any, i: number) => {
                                const heightPct = maxValue > 0 ? (point.revenue / maxValue) * 100 : 0
                                return (
                                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end z-10 hover:opacity-80 transition-opacity" title={`${point.date}: ${formatCurrency(point.revenue)}`}>
                                        <div
                                            className="w-full bg-primary-500 rounded-t-sm"
                                            style={{
                                                height: `${Math.max(heightPct, 2)}%`,
                                            }}
                                        />
                                        <span className="text-[10px] font-medium text-muted-foreground">{formatDate(point.date)}</span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
