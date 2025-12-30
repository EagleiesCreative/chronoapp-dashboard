import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // Get all broadcasts for the org
        const { data: broadcasts, error: broadcastError } = await supabase
            .from('broadcasts')
            .select('id')
            .eq('organization_id', orgId)

        if (broadcastError) {
            throw broadcastError
        }

        if (!broadcasts || broadcasts.length === 0) {
            return NextResponse.json({ count: 0 })
        }

        const broadcastIds = broadcasts.map(b => b.id)

        // Get read records for this user
        const { data: reads, error: readError } = await supabase
            .from('broadcast_reads')
            .select('broadcast_id')
            .eq('user_id', userId)
            .in('broadcast_id', broadcastIds)

        if (readError) {
            throw readError
        }

        const readIds = new Set(reads?.map(r => r.broadcast_id) || [])
        const unreadCount = broadcastIds.filter(id => !readIds.has(id)).length

        return NextResponse.json({ count: unreadCount })
    } catch (err) {
        console.error("/api/broadcast/unread GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
