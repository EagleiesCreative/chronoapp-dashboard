import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { validateAccountNumber, BANK_ACCOUNT_LENGTH_RULES } from "@/lib/xendit"

// Validate bank account number (basic format validation only)
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const body = await req.json()
        const { bankCode, accountNumber } = body

        if (!bankCode || !accountNumber) {
            return NextResponse.json({
                error: "Bank code and account number are required"
            }, { status: 400 })
        }

        // Basic validation only
        const validation = validateAccountNumber(bankCode, accountNumber)

        if (!validation.valid) {
            return NextResponse.json({
                valid: false,
                error: validation.error
            })
        }

        return NextResponse.json({
            valid: true,
            message: "Account format is valid"
        })
    } catch (err: any) {
        console.error("/api/validate-account POST error", err)
        return NextResponse.json({
            error: err.message || "Internal server error"
        }, { status: 500 })
    }
}

// Get bank account length rules
export async function GET() {
    return NextResponse.json({
        rules: BANK_ACCOUNT_LENGTH_RULES
    })
}
