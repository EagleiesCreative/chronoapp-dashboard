import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // Check if user is admin
        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        // Fetch all member revenue shares for this org
        const { data: memberShares, error } = await supabase
            .from('member_revenue_shares')
            .select('user_id, revenue_share_percent')
            .eq('organization_id', orgId)

        if (error) {
            console.error("Error fetching member revenue shares:", error)
            return NextResponse.json({ memberShares: {} })
        }

        // Convert to a map of userId -> percent
        const sharesMap: Record<string, number> = {}
        memberShares?.forEach((m: any) => {
            sharesMap[m.user_id] = m.revenue_share_percent ?? 80
        })

        return NextResponse.json({ memberShares: sharesMap })
    } catch (err) {
        console.error("/api/orgs/revenue-share GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // Check if user is admin
        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const body = await req.json()
        const { memberId, clientPercent } = body

        if (!memberId) {
            return NextResponse.json({ error: "Member ID required" }, { status: 400 })
        }

        // Validate percentage
        if (typeof clientPercent !== 'number' || clientPercent < 0 || clientPercent > 100) {
            return NextResponse.json({ error: "Invalid percentage value" }, { status: 400 })
        }

        // Upsert the member's revenue share
        const { error: upsertError } = await supabase
            .from('member_revenue_shares')
            .upsert({
                organization_id: orgId,
                user_id: memberId,
                revenue_share_percent: Math.round(clientPercent),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id,user_id'
            })

        if (upsertError) {
            console.error("Error upserting member revenue share:", upsertError)
            return NextResponse.json({
                error: "Failed to update revenue share",
                details: upsertError.message
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            memberId,
            clientPercent: Math.round(clientPercent),
            adminPercent: 100 - Math.round(clientPercent)
        })
    } catch (err) {
        console.error("/api/orgs/revenue-share POST error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
