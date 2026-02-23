import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

interface SessionPhoto {
    id: string
    final_image_url: string
    created_at: string
    booth_name: string
    booth_id: string
}

interface DateFolder {
    date: string
    displayDate: string
    photos: SessionPhoto[]
    count: number
}

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // Pagination parameters
        const searchParams = req.nextUrl.searchParams
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "50")
        const start = (page - 1) * limit
        const end = start + limit - 1

        // Use count to get total number of items
        const { data: sessions, error, count } = await supabase
            .from('sessions')
            .select(`
                id,
                final_image_url,
                created_at,
                booth_id,
                booths!inner (
                    id,
                    name,
                    organization_id
                )
            `, { count: 'exact' })
            .not('final_image_url', 'is', null)
            .eq('booths.organization_id', orgId)
            .order('created_at', { ascending: false })
            .range(start, end)

        if (error) {
            console.error("Supabase error fetching gallery:", error)
            return NextResponse.json({ error: "Failed to fetch gallery from database" }, { status: 500 })
        }

        // Group photos by date
        const dateMap: Record<string, SessionPhoto[]> = {}

        sessions?.forEach((session: any) => {
            const dateObj = new Date(session.created_at)
            const dateKey = dateObj.toISOString().split('T')[0] // YYYY-MM-DD

            const photo: SessionPhoto = {
                id: session.id,
                final_image_url: session.final_image_url,
                created_at: session.created_at,
                booth_name: session.booths?.name || 'Unknown Booth',
                booth_id: session.booth_id
            }

            if (!dateMap[dateKey]) {
                dateMap[dateKey] = []
            }
            dateMap[dateKey].push(photo)
        })

        // Convert to array of date folders, sorted newest first
        const dateFolders: DateFolder[] = Object.entries(dateMap)
            .map(([date, photos]) => {
                const dateObj = new Date(date + 'T00:00:00')
                const displayDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })

                return {
                    date,
                    displayDate,
                    photos,
                    count: photos.length
                }
            })
            .sort((a, b) => b.date.localeCompare(a.date)) // Newest first

        const totalPhotos = count || 0
        const hasMore = end < totalPhotos - 1

        return NextResponse.json({
            folders: dateFolders,
            totalPhotos,
            totalFolders: dateFolders.length,
            hasMore,
            nextPage: hasMore ? page + 1 : null
        })
    } catch (err) {
        console.error("/api/gallery GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
