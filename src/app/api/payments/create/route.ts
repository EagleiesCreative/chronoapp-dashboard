import { NextResponse, NextRequest } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { createInvoice } from "@/lib/xendit"

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        const user = await currentUser()
        const email = user?.emailAddresses[0]?.emailAddress

        if (!email) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 })
        }

        const timestamp = Date.now()
        const external_id = `invoice_${userId}_${timestamp}`
        const amount = 25750
        const description = "Test Transaction via Quick Create"

        const invoice = await createInvoice({
            external_id,
            amount,
            payer_email: email,
            description,
        })

        return NextResponse.json({ invoice_url: invoice.invoice_url })
    } catch (err: any) {
        console.error("/api/payments/create POST error", err)
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
    }
}
