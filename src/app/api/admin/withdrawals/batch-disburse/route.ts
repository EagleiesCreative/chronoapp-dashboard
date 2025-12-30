import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { createPayout, BANK_CHANNEL_CODES, EWALLET_CHANNEL_CODES } from "@/lib/xendit"

// Batch disburse approved withdrawals via Xendit
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
        const { withdrawalIds } = body

        if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
            return NextResponse.json({ error: "Withdrawal IDs array required" }, { status: 400 })
        }

        // Fetch approved withdrawals
        const { data: withdrawals, error: fetchError } = await supabase
            .from('withdrawals')
            .select('*')
            .in('id', withdrawalIds)
            .eq('organization_id', orgId)
            .eq('approval_status', 'APPROVED')

        if (fetchError) {
            return NextResponse.json({
                error: "Failed to fetch withdrawals",
                details: fetchError.message
            }, { status: 500 })
        }

        if (!withdrawals || withdrawals.length === 0) {
            return NextResponse.json({ error: "No approved withdrawals found" }, { status: 404 })
        }

        // Process each withdrawal individually (Xendit batch API requires specific format)
        const results = []
        const batchId = `BATCH-${Date.now()}`

        for (const withdrawal of withdrawals) {
            try {
                // Get channel code
                const allChannelCodes = { ...BANK_CHANNEL_CODES, ...EWALLET_CHANNEL_CODES }
                const channelCode = allChannelCodes[withdrawal.bank_code as keyof typeof allChannelCodes]

                if (!channelCode) {
                    results.push({
                        withdrawalId: withdrawal.id,
                        success: false,
                        error: `Invalid bank code: ${withdrawal.bank_code}`
                    })
                    continue
                }

                // Create individual payout via Xendit
                const payout = await createPayout({
                    reference_id: withdrawal.reference_id,
                    channel_code: channelCode,
                    channel_properties: {
                        account_holder_name: withdrawal.account_holder_name,
                        account_number: withdrawal.account_number,
                    },
                    amount: withdrawal.amount,
                    description: `Batch withdrawal - ${withdrawal.reference_id}`,
                })

                // Update withdrawal with Xendit payout ID and batch ID
                await supabase
                    .from('withdrawals')
                    .update({
                        xendit_payout_id: payout.id,
                        batch_id: batchId,
                        status: payout.status,
                        approval_status: 'DISBURSED',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', withdrawal.id)

                results.push({
                    withdrawalId: withdrawal.id,
                    success: true,
                    payoutId: payout.id,
                    status: payout.status,
                })
            } catch (error: any) {
                console.error(`Error processing withdrawal ${withdrawal.id}:`, error)
                results.push({
                    withdrawalId: withdrawal.id,
                    success: false,
                    error: error.message,
                })
            }
        }

        const successCount = results.filter(r => r.success).length
        const failureCount = results.filter(r => !r.success).length

        return NextResponse.json({
            success: true,
            batchId,
            totalProcessed: withdrawals.length,
            successCount,
            failureCount,
            results,
            message: `Batch disbursement completed: ${successCount} successful, ${failureCount} failed`,
        })
    } catch (err: any) {
        console.error("/api/admin/withdrawals/batch-disburse POST error", err)
        return NextResponse.json({
            error: err.message || "Internal server error"
        }, { status: 500 })
    }
}
