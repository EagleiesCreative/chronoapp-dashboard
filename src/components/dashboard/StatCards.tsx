"use client"

export function StatCards({ stats, loading }: { stats?: any, loading?: boolean }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-border">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-[180px] animate-pulse bg-card" />
                ))}
            </div>
        )
    }

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const cards = [
        { 
            label: "Total Revenue", 
            value: stats ? formatNumber(stats.totalRevenue) : "0",
            currency: "Rp",
            badge: "Realtime",
            badgeSub: "Connected"
        },
        { 
            label: "Total Transactions", 
            value: stats ? stats.totalTransactions.toString() : "0",
            badge: "Active",
            badgeSub: "Today"
        },
        { 
            label: "Success Rate", 
            value: stats ? `${stats.successRate}` : "0",
            currency: "%",
            badge: "Healthy",
            badgeSub: "System"
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-border animate-fade-in-up">
            {cards.map((card, idx) => (
                <div
                    key={card.label}
                    className="bg-card p-7 lg:px-8 relative overflow-hidden group hover:bg-card/80 transition-colors duration-300 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent before:opacity-0 hover:before:opacity-60 before:transition-opacity"
                    style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
                >
                    <div className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-muted-foreground mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-border">
                        {card.label}
                    </div>
                    
                    <div className="font-serif text-[2.8rem] font-light leading-none text-foreground mb-3 tracking-tight">
                        {card.currency === "Rp" && (
                            <span className="text-[1.2rem] text-muted-foreground font-light align-super mr-[2px]">{card.currency} </span>
                        )}
                        {card.value}
                        {card.currency === "%" && (
                            <span className="text-[1.2rem] text-muted-foreground font-light align-super ml-[2px]">{card.currency}</span>
                        )}
                    </div>
                    
                    <div className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 before:content-[''] before:w-[5px] before:h-[5px] before:bg-primary before:rounded-full before:animate-glow-pulse">
                        {card.badge} <span className="text-[0.55rem] text-muted-foreground ml-[2px]">{card.badgeSub}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
