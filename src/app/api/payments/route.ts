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

        // 1. Fetch booths belonging to this organization
        if (!orgId) return NextResponse.json({ error: "Organization ID required" }, { status: 400 })

        const { data: booths, error: boothsError } = await supabase
            .from('booths')
            .select('id')
            .eq('organization_id', orgId)

        if (boothsError) {
            console.error("Supabase error fetching booths:", boothsError)
            return NextResponse.json({ error: "Failed to fetch organization booths" }, { status: 500 })
        }

        const boothIds = booths.map(b => b.id)

        // 2. Fetch payments for these booths
        let query = supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })

        // If org has booths, filter by them. If no booths, return empty (or filter by empty list)
        if (boothIds.length > 0) {
            query = query.in('booth_id', boothIds)
        } else {
            // No booths = no payments for this org
            // We can just return empty here or let the query run with empty IN clause (which might fail or return all depending on implementation)
            // Safer to just return empty result immediately
            return NextResponse.json({
                payments: [],
                count: 0,
                totalRevenue: 0,
                paidCount: 0,
                isAdmin,
                userRevenueSharePercent: 80, // Default to show something
                netRevenue: 0,
                orgCut: 0,
                memberBreakdown: [],
                avgOrgPercent: 20,
                estimatedOrgEarnings: 0
            })
        }

        const { data: supabasePayments, error } = await query

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
