"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconTrendingUp, IconTrendingDown, IconLoader } from "@tabler/icons-react"

interface DashboardStats {
    totalRevenue: number
    paidCount: number
    pendingCount: number
    expiredCount: number
    successRate: number
    totalTransactions: number
}

export function DashboardStatsCards() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard/stats')
            const data = await res.json()
            if (data.stats) {
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-8 w-32 bg-muted rounded mt-2" />
                        </CardHeader>
                    </Card>
                ))}
            </div>
        )
    }

    if (!stats) return null

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <Card className="bg-gradient-to-t from-primary/5 to-card">
                <CardHeader>
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl">
                        {formatCurrency(stats.totalRevenue)}
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-muted-foreground">
                        From {stats.paidCount} paid transactions
                    </div>
                </CardFooter>
            </Card>

            {/* Paid Transactions */}
            <Card className="bg-gradient-to-t from-green-500/5 to-card">
                <CardHeader>
                    <CardDescription>Paid Transactions</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl">
                        {stats.paidCount}
                    </CardTitle>
                    {stats.successRate >= 70 && (
                        <Badge variant="outline" className="w-fit">
                            <IconTrendingUp className="w-3 h-3 mr-1" />
                            {stats.successRate}% success
                        </Badge>
                    )}
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-green-600 dark:text-green-400">
                        Successful payments <IconTrendingUp className="size-4" />
                    </div>
                </CardFooter>
            </Card>

            {/* Pending Payments */}
            <Card className="bg-gradient-to-t from-yellow-500/5 to-card">
                <CardHeader>
                    <CardDescription>Pending Payments</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl">
                        {stats.pendingCount}
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-muted-foreground">
                        Awaiting payment
                    </div>
                </CardFooter>
            </Card>

            {/* Success Rate */}
            <Card className="bg-gradient-to-t from-blue-500/5 to-card">
                <CardHeader>
                    <CardDescription>Success Rate</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl">
                        {stats.successRate}%
                    </CardTitle>
                    {stats.successRate >= 70 ? (
                        <Badge variant="outline" className="w-fit text-green-600">
                            <IconTrendingUp className="w-3 h-3 mr-1" />
                            Excellent
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="w-fit text-yellow-600">
                            <IconTrendingDown className="w-3 h-3 mr-1" />
                            Needs attention
                        </Badge>
                    )}
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-muted-foreground">
                        {stats.paidCount} of {stats.totalTransactions} total
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
