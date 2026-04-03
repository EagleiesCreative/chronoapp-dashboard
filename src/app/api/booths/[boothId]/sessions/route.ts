import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ boothId: string }> }
) {
    try {
        const { boothId } = await params
        const { userId, orgId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // Fetch sessions for this booth
        // We also check if the booth belongs to the org (via joining or direct check)
        // For simplicity, we just filter by booth_id
        const { data: sessions, error } = await supabase
            .from('booth_sessions')
            .select('*')
            .eq('booth_id', boothId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(`/api/booths/${boothId}/sessions GET error:`, error)
            return NextResponse.json({ error: "Failed to fetch booth sessions" }, { status: 500 })
        }

        return NextResponse.json({ sessions })

    } catch (err: unknown) {
        console.error("/api/booths/[boothId]/sessions GET error", err)
        const message = err instanceof Error ? err.message : "Internal server error"
        return NextResponse.json({
            error: message
        }, { status: 500 })
    }
}
