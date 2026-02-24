import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ boothId: string }> }
) {
    try {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const boothId = (await params).boothId

        // 1. Verify booth belongs to org
        const { data: booth, error: boothError } = await supabase
            .from('booths')
            .select('id')
            .eq('id', boothId)
            .eq('organization_id', orgId)
            .single()

        if (boothError || !booth) {
            return NextResponse.json({ error: "Booth not found" }, { status: 404 })
        }

        // 2. Fetch total paid sessions

        const { count: sessionCount, error: countError } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('booth_id', boothId)
            .in('status', ['PAID', 'SETTLED'])

        if (countError) {
            console.error("Error fetching session stats:", countError)
            // graceful degradation
            return NextResponse.json({ sessions: 0, photos: 0 })
        }

        const sessions = sessionCount || 0

        // 3. Count actual photos from the sessions table
        const { count: photoCount, error: photoError } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('booth_id', boothId)
            .not('final_image_url', 'is', null)

        if (photoError) {
            console.error("Error fetching photo stats:", photoError)
            // graceful degradation
        }

        const photos = photoCount || 0

        return NextResponse.json({
            sessions,
            photos
        })

    } catch (err: any) {
        console.error(`/api/booths/[boothId]/stats GET error:`, err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
