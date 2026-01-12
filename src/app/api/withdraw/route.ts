import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { createPayout, BANK_CHANNEL_CODES, EWALLET_CHANNEL_CODES } from "@/lib/xendit"
import { encrypt, maskBankAccount } from "@/lib/encryption"

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        const body = await req.json()
        const { amount, bankCode, accountNumber, accountHolderName, description } = body

        // Validate required fields
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
        }

        if (!bankCode || !accountNumber || !accountHolderName) {
            return NextResponse.json({ error: "Bank details required" }, { status: 400 })
        }

        const isAdmin = orgRole === "org:admin"

        // Calculate available balance based on role
        // Fetch total revenue first
        const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('amount, status')

        if (paymentsError) {
            return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
        }

        let totalRevenue = 0
        payments?.forEach(p => {
            if (p.status?.toUpperCase() === 'PAID' || p.status?.toUpperCase() === 'SETTLED') {
                totalRevenue += p.amount || 0
            }
        })

        // Get user's revenue share percentage
        let userSharePercent = 80
        if (!isAdmin) {
            const { data: shareData } = await supabase
                .from('member_revenue_shares')
                .select('revenue_share_percent')
                .eq('organization_id', orgId)
                .eq('user_id', userId)
                .single()

            if (shareData?.revenue_share_percent) {
                userSharePercent = shareData.revenue_share_percent
            }
        }

        // Calculate net balance based on role
        let availableBalance: number
        if (isAdmin) {
            // Admin gets org earnings (100% - avg member share)
            const { data: allShares } = await supabase
                .from('member_revenue_shares')
                .select('revenue_share_percent')
                .eq('organization_id', orgId)

            const avgMemberShare = allShares && allShares.length > 0
                ? allShares.reduce((sum, s) => sum + s.revenue_share_percent, 0) / allShares.length
                : 80

            availableBalance = Math.round(totalRevenue * ((100 - avgMemberShare) / 100))
        } else {
            // Member gets their share
            availableBalance = Math.round(totalRevenue * (userSharePercent / 100))
        }

        // Get already withdrawn amount
        const { data: withdrawals } = await supabase
            .from('withdrawals')
            .select('amount, status')
            .eq('organization_id', orgId)
            .eq('user_id', userId)
            .in('status', ['PENDING', 'SUCCEEDED', 'ACCEPTED'])

        const alreadyWithdrawn = withdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0
        const netBalance = availableBalance - alreadyWithdrawn

        // Check if requested amount exceeds available balance
        if (amount > netBalance) {
            return NextResponse.json({
                error: `Insufficient balance. Available: ${netBalance}, Requested: ${amount}`
            }, { status: 400 })
        }

        // Validate bank channel code
        const allChannelCodes = { ...BANK_CHANNEL_CODES, ...EWALLET_CHANNEL_CODES }
        const channelCode = allChannelCodes[bankCode as keyof typeof allChannelCodes]
        if (!channelCode) {
            return NextResponse.json({ error: "Invalid bank code" }, { status: 400 })
        }

        // Generate unique reference ID
        const referenceId = `WD-${orgId.slice(-8)}-${userId.slice(-8)}-${Date.now()}`

        // Encrypt sensitive bank data before storing
        const encryptedAccountNumber = encrypt(accountNumber)
        const encryptedHolderName = encrypt(accountHolderName)
        const accountLast4 = accountNumber.slice(-4)

        // Store withdrawal record in Supabase with PENDING_APPROVAL status
        // Admin will approve and batch disburse later
        const { data: withdrawal, error: insertError } = await supabase
            .from('withdrawals')
            .insert({
                organization_id: orgId,
                user_id: userId,
                reference_id: referenceId,
                amount: amount,
                bank_code: bankCode,
                account_number_encrypted: encryptedAccountNumber,
                account_holder_name_encrypted: encryptedHolderName,
                account_number_last4: accountLast4,
                status: 'PENDING',
                approval_status: 'PENDING_APPROVAL', // Requires admin approval
                is_admin: isAdmin,
            })
            .select()
            .single()

        if (insertError) {
            console.error("Error storing withdrawal:", insertError)
            return NextResponse.json({
                error: "Failed to create withdrawal request",
                details: insertError.message
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            withdrawal: {
                id: withdrawal.id,
                reference_id: withdrawal.reference_id,
                amount: withdrawal.amount,
                status: withdrawal.status,
                approval_status: withdrawal.approval_status,
            },
            message: "Withdrawal request submitted. Awaiting admin approval.",
            remainingBalance: netBalance - amount,
        })
    } catch (err: any) {
        console.error("/api/withdraw POST error", err)
        return NextResponse.json({
            error: err.message || "Failed to process withdrawal"
        }, { status: 500 })
    }
}

// GET endpoint to fetch withdrawal history
export async function GET(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        const isAdmin = orgRole === "org:admin"

        // Fetch withdrawals - admin sees all org withdrawals, member sees own
        let query = supabase
            .from('withdrawals')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (!isAdmin) {
            query = query.eq('user_id', userId)
        }

        const { data: withdrawals, error } = await query

        if (error) {
            console.error("Error fetching withdrawals:", error)
            return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 })
        }

        return NextResponse.json({ withdrawals })
    } catch (err) {
        console.error("/api/withdraw GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
