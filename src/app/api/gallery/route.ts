import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { deleteFile } from "@/lib/r2-storage"

interface SessionPhoto {
    id: string
    final_image_url: string
    created_at: string
    booth_name: string
    booth_id: string
    event_name?: string
}

interface DateFolder {
    date: string        // YYYY-MM-DD
    displayDate: string
    photos: SessionPhoto[]
    count: number
}

interface SessionGroup {
    sessionId: string   // booth_session_id or 'unassigned'
    sessionName: string // booth_sessions.name or fallback
    totalPhotos: number
    sameMonth: boolean  // true if all photos fall within the same calendar month
    folders: DateFolder[]
}

interface BoothGroup {
    boothId: string
    boothName: string
    totalPhotos: number
    sessions: SessionGroup[]
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

        const searchParams = req.nextUrl.searchParams
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "100")
        const start = (page - 1) * limit
        const end = start + limit - 1

        const { data: sessions, error, count } = await supabase
            .from('sessions')
            .select(`
                id,
                final_image_url,
                created_at,
                booth_id,
                booth_session_id,
                booths!inner (
                    id,
                    name,
                    organization_id
                ),
                booth_sessions (
                    id,
                    name,
                    event_name
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

        // Two-level map: boothId → sessionId → dateKey → photos[]
        const boothMap: Record<string, {
            boothName: string
            sessionMap: Record<string, {
                sessionName: string
                dateMap: Record<string, SessionPhoto[]>
            }>
        }> = {}

        sessions?.forEach((s: any) => {
            const boothId: string = s.booth_id || 'unassigned-booth'
            const boothName: string = s.booths?.name || 'Unknown Booth'
            const sessionId: string = s.booth_session_id || 'unassigned'
            const sessionName: string =
                s.booth_sessions?.name ||
                s.booth_sessions?.event_name ||
                'Unnamed Session'
            const dateKey: string = new Date(s.created_at).toISOString().split('T')[0]

            const photo: SessionPhoto = {
                id: s.id,
                final_image_url: s.final_image_url,
                created_at: s.created_at,
                booth_name: boothName,
                booth_id: boothId,
                event_name: s.booth_sessions?.event_name || undefined
            }

            if (!boothMap[boothId]) {
                boothMap[boothId] = { boothName, sessionMap: {} }
            }
            const bEntry = boothMap[boothId]

            if (!bEntry.sessionMap[sessionId]) {
                bEntry.sessionMap[sessionId] = { sessionName, dateMap: {} }
            }
            const sEntry = bEntry.sessionMap[sessionId]

            if (!sEntry.dateMap[dateKey]) {
                sEntry.dateMap[dateKey] = []
            }
            sEntry.dateMap[dateKey].push(photo)
        })

        // Build BoothGroup[]
        const boothGroups: BoothGroup[] = Object.entries(boothMap)
            .map(([boothId, booth]) => {
                const sessionGroups: SessionGroup[] = Object.entries(booth.sessionMap)
                    .map(([sessionId, sess]) => {
                        const folders: DateFolder[] = Object.entries(sess.dateMap)
                            .map(([date, photos]) => ({
                                date,
                                displayDate: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }),
                                photos,
                                count: photos.length
                            }))
                            .sort((a, b) => b.date.localeCompare(a.date))

                        // sameMonth = true when all dates share the same YYYY-MM
                        const months = new Set(folders.map(f => f.date.slice(0, 7)))
                        const sameMonth = months.size <= 1

                        return {
                            sessionId,
                            sessionName: sess.sessionName,
                            totalPhotos: folders.reduce((sum, f) => sum + f.count, 0),
                            sameMonth,
                            folders
                        }
                    })
                    .sort((a, b) => {
                        const aNewest = a.folders[0]?.date || ''
                        const bNewest = b.folders[0]?.date || ''
                        return bNewest.localeCompare(aNewest)
                    })

                return {
                    boothId,
                    boothName: booth.boothName,
                    totalPhotos: sessionGroups.reduce((sum, sg) => sum + sg.totalPhotos, 0),
                    sessions: sessionGroups
                }
            })
            .sort((a, b) => {
                const aNewest = a.sessions[0]?.folders[0]?.date || ''
                const bNewest = b.sessions[0]?.folders[0]?.date || ''
                return bNewest.localeCompare(aNewest)
            })

        const totalPhotos = count || 0
        const hasMore = end < totalPhotos - 1

        return NextResponse.json({
            booths: boothGroups,
            totalPhotos,
            hasMore,
            nextPage: hasMore ? page + 1 : null
        })
    } catch (err) {
        console.error("/api/gallery GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
// Deletes a set of session records (and their R2 files) by ID.
// Only org:admin may delete. All IDs must belong to the authenticated org.

export async function DELETE(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }
        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }
        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const body = await req.json()
        const sessionIds: string[] = body.sessionIds

        if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
            return NextResponse.json({ error: "sessionIds array is required" }, { status: 400 })
        }

        // Fetch sessions with org ownership verification — IDOR prevention
        const { data: sessions, error: fetchError } = await supabase
            .from('sessions')
            .select(`
                id,
                final_image_url,
                photos_urls,
                booths!inner ( organization_id )
            `)
            .in('id', sessionIds)
            .eq('booths.organization_id', orgId)

        if (fetchError) {
            console.error("Error fetching sessions for deletion:", fetchError)
            return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
        }

        if (!sessions || sessions.length === 0) {
            return NextResponse.json({ error: "No matching sessions found" }, { status: 404 })
        }

        // Delete R2 files — best-effort (deleteFile swallows errors to not block DB cleanup)
        const deletePromises: Promise<void>[] = []
        sessions.forEach((s: any) => {
            if (s.final_image_url) {
                deletePromises.push(deleteFile(s.final_image_url))
            }
            if (Array.isArray(s.photos_urls)) {
                s.photos_urls.forEach((url: string) => {
                    if (url) deletePromises.push(deleteFile(url))
                })
            }
        })
        await Promise.allSettled(deletePromises)

        // Delete DB records (only the verified IDs owned by this org)
        const verifiedIds = sessions.map((s: any) => s.id)

        // 1. Nullify session_id in payments table first — required due to FK constraint
        const { error: unlinkError } = await supabase
            .from('payments')
            .update({ session_id: null })
            .in('session_id', verifiedIds)

        if (unlinkError) {
            console.error("Error unlinking payments before session deletion:", unlinkError)
            // We continue anyway, as the delete below will catch if the FK error persists
        }

        // 2. Delete the session records
        const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .in('id', verifiedIds)

        if (deleteError) {
            console.error("Error deleting sessions from DB:", deleteError)
            return NextResponse.json({ error: "Failed to delete sessions from database" }, { status: 500 })
        }

        return NextResponse.json({ deleted: verifiedIds.length })

    } catch (err) {
        console.error("/api/gallery DELETE error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
