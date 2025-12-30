import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

interface SupabasePayment {
    id: string
    session_id: string | null
    xendit_invoice_id: string
    amount: number
    status: string
    created_at: string
    updated_at: string
    booth_id: string | null
}

export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        // Fetch payments from Supabase
        const { data: payments, error } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Supabase error fetching payments:", error)
            return NextResponse.json({ error: "Failed to fetch payments from database" }, { status: 500 })
        }

        // Calculate statistics
        let totalRevenue = 0
        let paidCount = 0
        let pendingCount = 0
        let expiredCount = 0
        const dailyRevenue: Record<string, number> = {}

        const paymentsList = (payments || []) as SupabasePayment[]

        paymentsList.forEach((payment) => {
            const status = payment.status?.toUpperCase() || 'PENDING'
            const amount = payment.amount || 0

            if (status === 'PAID' || status === 'SETTLED') {
                paidCount++
                totalRevenue += amount

                // Group by date for chart
                const date = new Date(payment.created_at).toISOString().split('T')[0]
                dailyRevenue[date] = (dailyRevenue[date] || 0) + amount
            } else if (status === 'PENDING') {
                pendingCount++
            } else if (status === 'EXPIRED') {
                expiredCount++
            }
        })

        // Calculate success rate
        const totalTransactions = paymentsList.length
        const successRate = totalTransactions > 0
            ? Math.round((paidCount / totalTransactions) * 100)
            : 0

        // Convert daily revenue to chart data
        const chartData = Object.entries(dailyRevenue)
            .map(([date, revenue]) => ({
                date,
                revenue
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30) // Last 30 days

        // Get recent transactions (last 5 paid)
        const recentTransactions = paymentsList
            .filter(p => {
                const status = p.status?.toUpperCase()
                return status === 'PAID' || status === 'SETTLED'
            })
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                external_id: p.xendit_invoice_id,
                amount: p.amount,
                status: p.status?.toUpperCase(),
                created: p.created_at,
                payment_method: 'QRIS'
            }))

        return NextResponse.json({
            stats: {
                totalRevenue,
                paidCount,
                pendingCount,
                expiredCount,
                successRate,
                totalTransactions
            },
            chartData,
            recentTransactions
        })
    } catch (err) {
        console.error("/api/dashboard/stats GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
