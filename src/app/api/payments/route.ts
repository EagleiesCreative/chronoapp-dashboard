import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

interface SupabasePayment {
    id: string
    session_id: string | null
    xendit_invoice_id: string
    xendit_qr_string: string | null
    amount: number
    status: string
    created_at: string
    updated_at: string
    booth_id: string | null
}

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        const isAdmin = orgRole === "org:admin"

        // Fetch payments from Supabase (trusting the database status)
        const { data: supabasePayments, error } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Supabase error fetching payments:", error)
            return NextResponse.json({ error: "Failed to fetch payments from database" }, { status: 500 })
        }

        // Map payments and calculate totals
        let paidCount = 0
        let totalRevenue = 0

        const payments = (supabasePayments as SupabasePayment[]).map(payment => {
            const status = payment.status?.toUpperCase() || 'PENDING'
            const isPaid = status === 'PAID' || status === 'SETTLED'

            if (isPaid) {
                paidCount++
                totalRevenue += payment.amount || 0
            }

            return {
                id: payment.id,
                xendit_id: payment.xendit_invoice_id,
                amount: payment.amount,
                status: status,
                payment_method: 'QRIS',
                created_at: payment.created_at,
                booth_id: payment.booth_id,
                session_id: payment.session_id
            }
        })

        // Get user's revenue share percentage (for members)
        let userRevenueSharePercent = 80 // default
        if (!isAdmin && orgId) {
            const { data: shareData } = await supabase
                .from('member_revenue_shares')
                .select('revenue_share_percent')
                .eq('organization_id', orgId)
                .eq('user_id', userId)
                .single()

            if (shareData?.revenue_share_percent) {
                userRevenueSharePercent = shareData.revenue_share_percent
            }
        }

        // Calculate net revenue for member
        const netRevenue = Math.round(totalRevenue * (userRevenueSharePercent / 100))
        const orgCut = totalRevenue - netRevenue

        // For admin: get all member revenue shares for breakdown
        let memberBreakdown: any[] = []
        if (isAdmin && orgId) {
            const { data: allShares } = await supabase
                .from('member_revenue_shares')
                .select('user_id, revenue_share_percent')
                .eq('organization_id', orgId)

            // Calculate org earnings (sum of all org cuts)
            // For simplicity, use average cut or show the gross total
            memberBreakdown = allShares?.map(share => ({
                userId: share.user_id,
                sharePercent: share.revenue_share_percent,
                orgPercent: 100 - share.revenue_share_percent
            })) || []
        }

        // Calculate average org share percentage
        const avgOrgPercent = memberBreakdown.length > 0
            ? Math.round(memberBreakdown.reduce((sum, m) => sum + m.orgPercent, 0) / memberBreakdown.length)
            : 20

        const estimatedOrgEarnings = Math.round(totalRevenue * (avgOrgPercent / 100))

        return NextResponse.json({
            payments,
            count: payments.length,
            totalRevenue,
            paidCount,
            isAdmin,
            // Member-specific data
            userRevenueSharePercent,
            netRevenue,
            orgCut,
            // Admin-specific data
            memberBreakdown,
            avgOrgPercent,
            estimatedOrgEarnings
        })
    } catch (err) {
        console.error("/api/payments GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
