import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getAccountBalance } from "@/lib/xendit"

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 })

        const accountType = (req.nextUrl.searchParams.get("account_type") as "CASH" | "HOLDING") || "CASH"

        const { balance } = await getAccountBalance(accountType, "IDR")

        return NextResponse.json({ balance, account_type: accountType, currency: "IDR" })
    } catch (err: any) {
        console.error("/api/payments/balance GET error", err)
        return NextResponse.json({ error: err.message || "Failed to fetch balance from Xendit" }, { status: 500 })
    }
}
