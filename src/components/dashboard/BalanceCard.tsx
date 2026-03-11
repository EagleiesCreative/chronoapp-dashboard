"use client"

export function BalanceCard({ chartData, stats, loading }: { chartData?: any[], stats?: any, loading?: boolean }) {
    if (loading) {
        return (
            <div className="bg-card p-7 lg:px-8 h-full animate-pulse">
                <div className="h-4 w-32 bg-muted rounded mb-8" />
                <div className="flex gap-8 mb-8">
                    <div className="h-12 w-24 bg-muted rounded" />
                    <div className="h-12 w-24 bg-muted rounded" />
                </div>
                <div className="h-[140px] w-full bg-muted/50 rounded" />
            </div>
        )
    }

    const data = chartData || []
    const maxValue = data.length > 0 ? Math.max(...data.map((d: any) => d.revenue)) : 1000

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)
    }

    const formatShortDay = (dateString: string) => {
        const d = new Date(dateString)
        return d.toLocaleDateString('en-US', { weekday: 'short' })
    }

    let displayData = data
    if (data.length > 7) {
        // Last 7 days for the bar chart
        displayData = data.slice(-7)
    }

    // Default 7 days if empty
    if (displayData.length === 0) {
        const today = new Date()
        displayData = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today)
            d.setDate(d.getDate() - (6 - i))
            return {
                date: d.toISOString(),
                revenue: 0
            }
        })
    }

    return (
        <div className="bg-card p-7 lg:px-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">Revenue Over Time</h2>
                <button className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-primary bg-transparent border-none cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                    View Report
                </button>
            </div>

            <div className="flex gap-8 mb-7">
                <div>
                    <div className="font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground mb-1">Total Revenue</div>
                    <div className="font-serif text-[1.5rem] font-light text-foreground">{formatCurrency(stats?.totalRevenue)}</div>
                </div>
                <div>
                    <div className="font-mono text-[0.58rem] tracking-[0.15em] uppercase text-muted-foreground mb-1">Total Trans.</div>
                    <div className="font-serif text-[1.5rem] font-light text-foreground">{stats?.totalTransactions || 0}</div>
                </div>
            </div>

            <div className="flex items-end gap-1.5 h-[140px] pb-7 relative flex-1 before:absolute before:bottom-7 before:inset-x-0 before:h-[1px] before:bg-border">
                {displayData.map((point: any, i: number) => {
                    const heightPct = maxValue > 0 ? (point.revenue / maxValue) * 100 : 0
                    // Make the last item "highlighted"
                    const isHighlight = i === displayData.length - 1
                    
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <div 
                                className={`w-full relative transition-colors duration-200 cursor-default min-h-[4px] ${
                                    isHighlight 
                                    ? 'bg-primary/35 border-t border-primary after:absolute after:inset-0 after:bg-gradient-to-b after:from-primary/20 after:to-transparent' 
                                    : 'bg-primary/15 border-t border-primary/30 group-hover:bg-primary/30'
                                }`}
                                style={{ height: `${Math.max(heightPct, 4)}%` }}
                                title={`${formatShortDay(point.date)}: ${formatCurrency(point.revenue)}`}
                            />
                            <div className="font-mono text-[0.55rem] tracking-[0.05em] text-muted-foreground whitespace-nowrap pb-1">
                                {formatShortDay(point.date)}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
