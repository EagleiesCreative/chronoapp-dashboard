import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

interface Payment {
    id: string
    amount: number
    status: string
    created_at: string
}

// Statistical helper functions
function calculateMean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
}

function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
}

function calculateStandardDeviation(variance: number): number {
    return Math.sqrt(variance)
}

function calculateCoefficientOfVariation(stdDev: number, mean: number): number {
    if (mean === 0) return 0
    return (stdDev / mean) * 100
}

function calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    return (value - mean) / stdDev
}

function calculateQuartiles(values: number[]): { q1: number; q2: number; q3: number; iqr: number } {
    if (values.length === 0) return { q1: 0, q2: 0, q3: 0, iqr: 0 }
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length

    const q1 = sorted[Math.floor(n * 0.25)]
    const q2 = sorted[Math.floor(n * 0.5)]
    const q3 = sorted[Math.floor(n * 0.75)]

    return { q1, q2, q3, iqr: q3 - q1 }
}

export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        // Fetch all payments from Supabase
        const { data: payments, error } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Supabase error fetching analytics:", error)
            return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
        }

        const allPayments = (payments || []) as Payment[]
        const paidPayments = allPayments.filter(p =>
            p.status?.toUpperCase() === 'PAID' || p.status?.toUpperCase() === 'SETTLED'
        )
        const paidAmounts = paidPayments.map(p => p.amount)

        // Core statistics
        const mean = calculateMean(paidAmounts)
        const median = calculateMedian(paidAmounts)
        const variance = calculateVariance(paidAmounts, mean)
        const stdDev = calculateStandardDeviation(variance)
        const cv = calculateCoefficientOfVariation(stdDev, mean)
        const quartiles = calculateQuartiles(paidAmounts)

        // Total revenue
        const totalRevenue = paidAmounts.reduce((sum, val) => sum + val, 0)

        // Daily revenue analysis
        const dailyRevenue: Record<string, number[]> = {}
        paidPayments.forEach(p => {
            const date = new Date(p.created_at).toISOString().split('T')[0]
            if (!dailyRevenue[date]) dailyRevenue[date] = []
            dailyRevenue[date].push(p.amount)
        })

        const dailyTotals = Object.entries(dailyRevenue).map(([date, amounts]) => ({
            date,
            total: amounts.reduce((s, v) => s + v, 0),
            count: amounts.length,
            avg: amounts.length > 0 ? amounts.reduce((s, v) => s + v, 0) / amounts.length : 0
        })).sort((a, b) => a.date.localeCompare(b.date))

        // Daily revenue statistics
        const dailyTotalValues = dailyTotals.map(d => d.total)
        const dailyMean = calculateMean(dailyTotalValues)
        const dailyStdDev = calculateStandardDeviation(calculateVariance(dailyTotalValues, dailyMean))

        // Identify outlier days (z-score > 2)
        const outlierDays = dailyTotals.map(d => ({
            ...d,
            zScore: calculateZScore(d.total, dailyMean, dailyStdDev),
            isOutlier: Math.abs(calculateZScore(d.total, dailyMean, dailyStdDev)) > 2
        }))

        // Hourly distribution
        const hourlyDistribution: Record<number, { count: number; total: number }> = {}
        for (let i = 0; i < 24; i++) {
            hourlyDistribution[i] = { count: 0, total: 0 }
        }

        paidPayments.forEach(p => {
            const hour = new Date(p.created_at).getHours()
            hourlyDistribution[hour].count++
            hourlyDistribution[hour].total += p.amount
        })

        const hourlyData = Object.entries(hourlyDistribution).map(([hour, data]) => ({
            hour: parseInt(hour),
            label: `${hour.padStart(2, '0')}:00`,
            transactions: data.count,
            revenue: data.total
        }))

        // Peak hour calculation
        const peakHour = hourlyData.reduce((max, curr) =>
            curr.transactions > max.transactions ? curr : max, hourlyData[0])

        // Transaction amount distribution (buckets)
        const buckets = [
            { min: 0, max: 25000, label: '< 25k', count: 0 },
            { min: 25000, max: 50000, label: '25k-50k', count: 0 },
            { min: 50000, max: 100000, label: '50k-100k', count: 0 },
            { min: 100000, max: 200000, label: '100k-200k', count: 0 },
            { min: 200000, max: Infinity, label: '> 200k', count: 0 },
        ]

        paidAmounts.forEach(amount => {
            for (const bucket of buckets) {
                if (amount >= bucket.min && amount < bucket.max) {
                    bucket.count++
                    break
                }
            }
        })

        // Performance metrics (last 7 days vs previous 7 days)
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        const last7Days = paidPayments.filter(p => new Date(p.created_at) >= sevenDaysAgo)
        const prev7Days = paidPayments.filter(p => {
            const d = new Date(p.created_at)
            return d >= fourteenDaysAgo && d < sevenDaysAgo
        })

        const last7Revenue = last7Days.reduce((s, p) => s + p.amount, 0)
        const prev7Revenue = prev7Days.reduce((s, p) => s + p.amount, 0)
        const revenueGrowth = prev7Revenue > 0 ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100 : 0

        return NextResponse.json({
            summary: {
                totalTransactions: allPayments.length,
                paidTransactions: paidPayments.length,
                totalRevenue,
                successRate: allPayments.length > 0 ? (paidPayments.length / allPayments.length) * 100 : 0
            },
            transactionStats: {
                mean: Math.round(mean),
                median: Math.round(median),
                variance: Math.round(variance),
                standardDeviation: Math.round(stdDev),
                coefficientOfVariation: Math.round(cv * 100) / 100,
                quartiles: {
                    q1: Math.round(quartiles.q1),
                    q2: Math.round(quartiles.q2),
                    q3: Math.round(quartiles.q3),
                    iqr: Math.round(quartiles.iqr)
                },
                min: paidAmounts.length > 0 ? Math.min(...paidAmounts) : 0,
                max: paidAmounts.length > 0 ? Math.max(...paidAmounts) : 0,
                range: paidAmounts.length > 0 ? Math.max(...paidAmounts) - Math.min(...paidAmounts) : 0
            },
            dailyAnalysis: {
                data: dailyTotals.slice(-30),
                dailyMean: Math.round(dailyMean),
                dailyStdDev: Math.round(dailyStdDev),
                outlierDays: outlierDays.filter(d => d.isOutlier)
            },
            hourlyDistribution: hourlyData,
            peakHour,
            amountDistribution: buckets,
            performance: {
                last7Days: {
                    transactions: last7Days.length,
                    revenue: last7Revenue
                },
                previous7Days: {
                    transactions: prev7Days.length,
                    revenue: prev7Revenue
                },
                revenueGrowth: Math.round(revenueGrowth * 100) / 100,
                transactionGrowth: prev7Days.length > 0
                    ? Math.round(((last7Days.length - prev7Days.length) / prev7Days.length) * 10000) / 100
                    : 0
            }
        })
    } catch (err) {
        console.error("/api/analytics GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
