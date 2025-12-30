import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { createPayout } from "@/lib/xendit"

// Approve a withdrawal request
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
        const { withdrawalId } = body

        if (!withdrawalId) {
            return NextResponse.json({ error: "Withdrawal ID required" }, { status: 400 })
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
                error: `Cannot approve withdrawal with status: ${withdrawal.approval_status}`
            }, { status: 400 })
        }

        // Update approval status
        const { error: updateError } = await supabase
            .from('withdrawals')
            .update({
                approval_status: 'APPROVED',
                approved_by: userId,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', withdrawalId)

        if (updateError) {
            console.error("Error approving withdrawal:", updateError)
            return NextResponse.json({
                error: "Failed to approve withdrawal",
                details: updateError.message
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: "Withdrawal approved successfully",
        })
    } catch (err: any) {
        console.error("/api/admin/withdrawals/approve POST error", err)
        return NextResponse.json({
            error: err.message || "Internal server error"
        }, { status: 500 })
    }
}
