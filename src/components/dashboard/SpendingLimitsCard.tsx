"use client"

export function SpendingLimitsCard({ stats, loading }: { stats?: any, loading?: boolean }) {
    if (loading) {
        return (
            <div className="bg-card p-7 lg:px-8 h-full animate-pulse">
                <div className="h-4 w-32 bg-muted rounded mb-8" />
                <div className="flex justify-center mb-8">
                    <div className="h-40 w-40 rounded-full border-4 border-muted" />
                </div>
                <div className="space-y-4">
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded" />
                </div>
            </div>
        )
    }

    const total = (stats?.paidCount || 0) + (stats?.pendingCount || 0) + (stats?.expiredCount || 0) || 1
    const paidCount = stats?.paidCount || 0
    const pendingCount = stats?.pendingCount || 0
    const expiredCount = stats?.expiredCount || 0

    const paidPct = (paidCount / total) * 100
    const pendingPct = (pendingCount / total) * 100
    const expiredPct = (expiredCount / total) * 100

    // Calculate dash arrays for SVG
    const radius = 15.91549430918954
    const circumference = 2 * Math.PI * radius // 100
    
    // Offsets
    const offset1 = 0 // Actually 25 in the CSS, but let's just make it simple sequentially
    const offset2 = 100 - paidPct
    const offset3 = 100 - paidPct - pendingPct

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount)
    }

    return (
        <div className="bg-card p-7 lg:px-8 h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">Payment Distribution</h2>
                <button className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-primary bg-transparent border-none cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                    View Report
                </button>
            </div>
            
            <div className="flex flex-col items-center gap-6">
                <div className="relative w-40 h-40">
                    <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                        {/* Background ring */}
                        <circle cx="18" cy="18" r={radius} fill="transparent" stroke="var(--border)" strokeWidth="2" />
                        
                        {/* Paid */}
                        {paidPct > 0 && (
                            <circle cx="18" cy="18" r={radius} fill="transparent" stroke="var(--accent)" strokeWidth="2" 
                                strokeDasharray={`${paidPct} ${100 - paidPct}`} strokeDashoffset={25} />
                        )}
                        {/* Pending */}
                        {pendingPct > 0 && (
                            <circle cx="18" cy="18" r={radius} fill="transparent" stroke="rgba(200,169,126,0.6)" strokeWidth="2" 
                                strokeDasharray={`${pendingPct} ${100 - pendingPct}`} strokeDashoffset={25 - paidPct} />
                        )}
                        {/* Expired/Failed */}
                        {expiredPct > 0 && (
                            <circle cx="18" cy="18" r={radius} fill="transparent" stroke="rgba(200,169,126,0.3)" strokeWidth="2" 
                                strokeDasharray={`${expiredPct} ${100 - expiredPct}`} strokeDashoffset={25 - paidPct - pendingPct} />
                        )}
                    </svg>
                    
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <span className="font-serif text-[1.8rem] font-light text-foreground leading-none block">{formatNumber(total)}</span>
                        <span className="font-mono text-[0.55rem] tracking-[0.15em] uppercase text-muted-foreground mt-1 block">Total Valid</span>
                    </div>
                </div>
                
                <div className="w-full">
                    {/* Paid Legend */}
                    <div className="flex items-center justify-between py-2 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="font-mono text-[0.65rem] tracking-[0.08em] text-muted-foreground">Paid Transactions</span>
                        </div>
                        <div>
                            <span className="font-serif text-[1rem] font-light text-foreground">{formatNumber(paidCount)}</span>
                            <span className="font-mono text-[0.6rem] text-muted-foreground ml-1.5">{Math.round(paidPct)}%</span>
                        </div>
                    </div>
                    
                    {/* Pending Legend */}
                    <div className="flex items-center justify-between py-2 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(200,169,126,0.6)" }} />
                            <span className="font-mono text-[0.65rem] tracking-[0.08em] text-muted-foreground">Pending</span>
                        </div>
                        <div>
                            <span className="font-serif text-[1rem] font-light text-foreground">{formatNumber(pendingCount)}</span>
                            <span className="font-mono text-[0.6rem] text-muted-foreground ml-1.5">{Math.round(pendingPct)}%</span>
                        </div>
                    </div>
                    
                    {/* Expired Legend */}
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(200,169,126,0.3)" }} />
                            <span className="font-mono text-[0.65rem] tracking-[0.08em] text-muted-foreground">Expired/Failed</span>
                        </div>
                        <div>
                            <span className="font-serif text-[1rem] font-light text-foreground">{formatNumber(expiredCount)}</span>
                            <span className="font-mono text-[0.6rem] text-muted-foreground ml-1.5">{Math.round(expiredPct)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
