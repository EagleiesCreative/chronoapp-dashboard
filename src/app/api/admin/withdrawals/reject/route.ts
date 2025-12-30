import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

// Reject a withdrawal request and refund to member balance
export async function POST(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const body = await req.json()
        const { withdrawalId, reason } = body

        if (!withdrawalId) {
            return NextResponse.json({ error: "Withdrawal ID required" }, { status: 400 })
        }

        if (!reason || reason.trim().length === 0) {
            return NextResponse.json({ error: "Rejection reason required" }, { status: 400 })
        }

        // Fetch the withdrawal
        const { data: withdrawal, error: fetchError } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('id', withdrawalId)
            .eq('organization_id', orgId)
            .single()

        if (fetchError || !withdrawal) {
            return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
        }

        if (withdrawal.approval_status !== 'PENDING_APPROVAL') {
            return NextResponse.json({
                error: `Cannot reject withdrawal with status: ${withdrawal.approval_status}`
            }, { status: 400 })
        }

        // Update withdrawal status to rejected
        const { error: updateError } = await supabase
            .from('withdrawals')
            .update({
                approval_status: 'REJECTED',
                status: 'CANCELLED',
                rejection_reason: reason,
                approved_by: userId, // Track who rejected it
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', withdrawalId)

        if (updateError) {
            console.error("Error rejecting withdrawal:", updateError)
            return NextResponse.json({
                error: "Failed to reject withdrawal",
                details: updateError.message
            }, { status: 500 })
        }

        // Note: The amount is automatically refunded since it was never actually disbursed
        // The withdrawal calculation in /api/payments already excludes REJECTED withdrawals

        return NextResponse.json({
            success: true,
            message: "Withdrawal rejected and amount refunded to member balance",
        })
    } catch (err: any) {
        console.error("/api/admin/withdrawals/reject POST error", err)
        return NextResponse.json({
            error: err.message || "Internal server error"
        }, { status: 500 })
    }
}
