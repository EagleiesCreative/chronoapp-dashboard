import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { validateAccountNumber } from "@/lib/xendit"

const EDIT_RESTRICTION_DAYS = 14

// GET - Fetch user's payment information
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // Fetch user's payment info
        const { data: user, error } = await supabase
            .from('users')
            .select('bank_code, account_number, account_holder_name, payment_info_updated_at')
            .eq('id', userId)
            .single()

        if (error) {
            console.error("Error fetching payment info:", error)
            return NextResponse.json({ error: "Failed to fetch payment information" }, { status: 500 })
        }

        // Check if user has payment info
        const hasPaymentInfo = !!(user?.bank_code && user?.account_number && user?.account_holder_name)

        // Calculate if user can edit (14 days since last update)
        let canEdit = true
        let nextEditableDate = null
        let daysUntilEditable = 0

        if (hasPaymentInfo && user?.payment_info_updated_at) {
            const lastUpdated = new Date(user.payment_info_updated_at)
            const now = new Date()
            const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))

            canEdit = daysSinceUpdate >= EDIT_RESTRICTION_DAYS

            if (!canEdit) {
                daysUntilEditable = EDIT_RESTRICTION_DAYS - daysSinceUpdate
                nextEditableDate = new Date(lastUpdated)
                nextEditableDate.setDate(nextEditableDate.getDate() + EDIT_RESTRICTION_DAYS)
            }
        }

        return NextResponse.json({
            paymentInfo: hasPaymentInfo ? {
                bankCode: user.bank_code,
                accountNumber: user.account_number,
                accountHolderName: user.account_holder_name,
                lastUpdated: user.payment_info_updated_at,
            } : null,
            canEdit,
            nextEditableDate,
            daysUntilEditable,
            hasPaymentInfo,
        })
    } catch (err: any) {
        console.error("/api/payment-info GET error", err)
        return NextResponse.json({
            error: err.message || "Internal server error"
        }, { status: 500 })
    }
}

// POST - Save or update payment information
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const body = await req.json()
        const { bankCode, accountNumber, accountHolderName } = body

        // Validate required fields
        if (!bankCode || !accountNumber || !accountHolderName) {
            return NextResponse.json({
                error: "All fields are required: bankCode, accountNumber, accountHolderName"
            }, { status: 400 })
        }

        // Validate account number format
        const validation = validateAccountNumber(bankCode, accountNumber)
        if (!validation.valid) {
            return NextResponse.json({
                error: validation.error || "Invalid account number format"
            }, { status: 400 })
        }

        // Fetch current user data to check edit restriction
        const { data: currentUser, error: fetchError } = await supabase
            .from('users')
            .select('bank_code, account_number, account_holder_name, payment_info_updated_at')
            .eq('id', userId)
            .single()

        if (fetchError) {
            console.error("Error fetching user:", fetchError)
            return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 })
        }

        // Check if user already has payment info
        const hasExistingPaymentInfo = !!(currentUser?.bank_code && currentUser?.account_number && currentUser?.account_holder_name)

        // If updating existing payment info, check 14-day restriction
        if (hasExistingPaymentInfo && currentUser?.payment_info_updated_at) {
            const lastUpdated = new Date(currentUser.payment_info_updated_at)
            const now = new Date()
            const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))

            if (daysSinceUpdate < EDIT_RESTRICTION_DAYS) {
                const daysRemaining = EDIT_RESTRICTION_DAYS - daysSinceUpdate
                const nextEditableDate = new Date(lastUpdated)
                nextEditableDate.setDate(nextEditableDate.getDate() + EDIT_RESTRICTION_DAYS)

                return NextResponse.json({
                    error: `Payment information can only be edited once every ${EDIT_RESTRICTION_DAYS} days. You can edit again in ${daysRemaining} day(s) on ${nextEditableDate.toLocaleDateString()}.`,
                    canEditAt: nextEditableDate,
                    daysRemaining,
                }, { status: 403 })
            }
        }

        // Update user's payment information
        const { error: updateError } = await supabase
            .from('users')
            .update({
                bank_code: bankCode,
                account_number: accountNumber,
                account_holder_name: accountHolderName.toUpperCase(),
                payment_info_updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

        if (updateError) {
            console.error("Error updating payment info:", updateError)
            return NextResponse.json({
                error: "Failed to save payment information",
                details: updateError.message
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: hasExistingPaymentInfo
                ? "Payment information updated successfully"
                : "Payment information saved successfully",
            paymentInfo: {
                bankCode,
                accountNumber,
                accountHolderName: accountHolderName.toUpperCase(),
                lastUpdated: new Date().toISOString(),
            }
        })
    } catch (err: any) {
        console.error("/api/payment-info POST error", err)
        return NextResponse.json({
            error: err.message || "Failed to save payment information"
        }, { status: 500 })
    }
}
