"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconRefresh, IconLoader, IconTrendingUp, IconTrendingDown, IconChartBar } from "@tabler/icons-react"
import { toast } from "sonner"

interface AnalyticsData {
    summary: {
        totalTransactions: number
        paidTransactions: number
        totalRevenue: number
        successRate: number
    }
    transactionStats: {
        mean: number
        median: number
        variance: number
        standardDeviation: number
        coefficientOfVariation: number
        quartiles: { q1: number; q2: number; q3: number; iqr: number }
        min: number
        max: number
        range: number
    }
    dailyAnalysis: {
        data: Array<{ date: string; total: number; count: number; avg: number }>
        dailyMean: number
        dailyStdDev: number
        outlierDays: Array<{ date: string; total: number; zScore: number }>
    }
    hourlyDistribution: Array<{ hour: number; label: string; transactions: number; revenue: number }>
    peakHour: { hour: number; label: string; transactions: number; revenue: number }
    amountDistribution: Array<{ label: string; count: number }>
    performance: {
        last7Days: { transactions: number; revenue: number }
        previous7Days: { transactions: number; revenue: number }
        revenueGrowth: number
        transactionGrowth: number
    }
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/analytics')
            const result = await res.json()
            if (result.error) throw new Error(result.error)
            setData(result)
        } catch (error) {
            console.error("Error fetching analytics:", error)
            toast.error("Failed to load analytics")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID').format(num)
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                        Failed to load analytics data
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { summary, transactionStats, dailyAnalysis, hourlyDistribution, peakHour, amountDistribution, performance } = data

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
                    <p className="text-sm text-muted-foreground">
                        Statistical analysis of your transaction data
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
                    <IconRefresh className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider">Total Revenue</CardDescription>
                        <CardTitle className="text-2xl font-mono">{formatCurrency(summary.totalRevenue)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs">
                            {performance.revenueGrowth >= 0 ? (
                                <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-950">
                                    <IconTrendingUp className="h-3 w-3 mr-1" />
                                    +{performance.revenueGrowth}%
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-red-600 bg-red-50 dark:bg-red-950">
                                    <IconTrendingDown className="h-3 w-3 mr-1" />
                                    {performance.revenueGrowth}%
                                </Badge>
                            )}
                            <span className="text-muted-foreground">vs last 7 days</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider">Success Rate</CardDescription>
                        <CardTitle className="text-2xl font-mono">{summary.successRate.toFixed(1)}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            {summary.paidTransactions} of {summary.totalTransactions} transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider">Mean Transaction</CardDescription>
                        <CardTitle className="text-2xl font-mono">{formatCurrency(transactionStats.mean)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            μ = {formatNumber(transactionStats.mean)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider">Std Deviation</CardDescription>
                        <CardTitle className="text-2xl font-mono">{formatCurrency(transactionStats.standardDeviation)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            σ = {formatNumber(transactionStats.standardDeviation)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Statistical Deep Dive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Transaction Distribution Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Distribution Statistics</CardTitle>
                        <CardDescription>Central tendency and dispersion measures</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Mean (μ)</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.mean)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Median</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.median)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Variance (σ²)</span>
                                    <span className="font-mono text-sm">{formatNumber(transactionStats.variance)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Std Dev (σ)</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.standardDeviation)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm text-muted-foreground">CV</span>
                                    <span className="font-mono text-sm">{transactionStats.coefficientOfVariation}%</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Q1 (25%)</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.quartiles.q1)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Q2 (50%)</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.quartiles.q2)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Q3 (75%)</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.quartiles.q3)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b pb-2">
                                    <span className="text-sm text-muted-foreground">IQR</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.quartiles.iqr)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm text-muted-foreground">Range</span>
                                    <span className="font-mono text-sm">{formatCurrency(transactionStats.range)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Amount Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Amount Distribution</CardTitle>
                        <CardDescription>Transaction value frequency histogram</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {amountDistribution.map((bucket, idx) => {
                                const maxCount = Math.max(...amountDistribution.map(b => b.count))
                                const percentage = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0

                                return (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{bucket.label}</span>
                                            <span className="font-mono">{bucket.count}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hourly Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <IconChartBar className="h-4 w-4" />
                        Hourly Transaction Distribution
                    </CardTitle>
                    <CardDescription>
                        Peak hour: <span className="font-semibold text-primary">{peakHour.label}</span> with {peakHour.transactions} transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-1 h-32">
                        {hourlyDistribution.map((hour) => {
                            const maxTx = Math.max(...hourlyDistribution.map(h => h.transactions))
                            const height = maxTx > 0 ? (hour.transactions / maxTx) * 100 : 0
                            const isPeak = hour.hour === peakHour.hour

                            return (
                                <div
                                    key={hour.hour}
                                    className="flex-1 flex flex-col items-center gap-1 group"
                                >
                                    <div
                                        className={`w-full rounded-t transition-all duration-300 ${isPeak ? 'bg-primary' : 'bg-muted hover:bg-primary/50'
                                            }`}
                                        style={{ height: `${Math.max(height, 2)}%` }}
                                        title={`${hour.label}: ${hour.transactions} tx, ${formatCurrency(hour.revenue)}`}
                                    />
                                    <span className="text-[10px] text-muted-foreground hidden lg:block">
                                        {hour.hour % 4 === 0 ? hour.label : ''}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Daily Performance & Outliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Daily Revenue Statistics</CardTitle>
                        <CardDescription>Volatility analysis of daily performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Daily Mean</p>
                                    <p className="text-xl font-mono">{formatCurrency(dailyAnalysis.dailyMean)}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Daily Std Dev</p>
                                    <p className="text-xl font-mono">{formatCurrency(dailyAnalysis.dailyStdDev)}</p>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p>Expected daily range (μ ± 2σ):</p>
                                <p className="font-mono text-foreground mt-1">
                                    {formatCurrency(Math.max(0, dailyAnalysis.dailyMean - 2 * dailyAnalysis.dailyStdDev))} — {formatCurrency(dailyAnalysis.dailyMean + 2 * dailyAnalysis.dailyStdDev)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Statistical Outliers</CardTitle>
                        <CardDescription>Days with |z-score| {">"} 2 (unusual performance)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dailyAnalysis.outlierDays.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-8 text-center">
                                No statistical outliers detected
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dailyAnalysis.outlierDays.slice(0, 5).map((day) => (
                                    <div key={day.date} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                                        <div>
                                            <p className="text-sm font-medium">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                            <p className="text-xs text-muted-foreground">{formatCurrency(day.total)}</p>
                                        </div>
                                        <Badge variant={day.zScore > 0 ? "default" : "destructive"} className="font-mono">
                                            z = {day.zScore.toFixed(2)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Formula Reference */}
            <Card className="border-dashed">
                <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Statistical Formula Reference</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                        <span>σ² = Σ(xᵢ - μ)² / N</span>
                        <span>σ = √σ²</span>
                        <span>CV = (σ / μ) × 100</span>
                        <span>z = (x - μ) / σ</span>
                        <span>IQR = Q3 - Q1</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
