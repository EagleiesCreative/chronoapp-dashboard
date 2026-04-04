import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { sanitizeText } from "@/lib/sanitize"
import { uploadFrame, getFreshSignedUrl } from "@/lib/r2-storage"

export async function GET() {
    try {
        const { userId, orgId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('frames')
            .select('*, booths(name), booth_sessions(name)')
            .eq('organization_id', orgId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("/api/frames GET error:", error)
            return NextResponse.json({ error: "Failed to fetch frames" }, { status: 500 })
        }

        // Refresh signed URLs for all frames before returning
        const framesWithFreshUrls = await Promise.all((data || []).map(async (frame) => ({
            ...frame,
            image_url: await getFreshSignedUrl(frame.image_url)
        })))

        return NextResponse.json({ data: framesWithFreshUrls })

    } catch (err: unknown) {
        console.error("/api/frames GET error", err)
        const message = err instanceof Error ? err.message : "Internal server error"
        return NextResponse.json({
            error: message
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // Role check: Only admin can create frames
        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const metadataStr = formData.get('metadata') as string | null

        if (!metadataStr) {
            return NextResponse.json({ error: "Metadata is required" }, { status: 400 })
        }

        const metadata = JSON.parse(metadataStr)
        const { name, photo_slots, dimensions, price, booth_id, booth_session_id } = metadata

        if (!name || !dimensions) {
            return NextResponse.json({ error: "Name and dimensions are required" }, { status: 400 })
        }

        let imageUrl = metadata.image_url

        if (file) {
            const buffer = Buffer.from(await file.arrayBuffer())
            imageUrl = await uploadFrame(buffer, file.name, orgId, file.type)
        }

        if (!imageUrl) {
            return NextResponse.json({ error: "Image is required" }, { status: 400 })
        }

        const { data: frame, error: insertError } = await supabase
            .from('frames')
            .insert({
                name: sanitizeText(name),
                organization_id: orgId,
                image_url: imageUrl,
                photo_slots: photo_slots || [],
                canvas_width: dimensions.width,
                canvas_height: dimensions.height,
                price: price || 0,
                booth_id: booth_id || null,
                booth_session_id: booth_session_id || null,
                is_active: true
            })
            .select()
            .single()

        if (insertError) {
            console.error("Supabase insert error:", insertError)
            return NextResponse.json({ error: "Failed to create frame" }, { status: 500 })
        }

        return NextResponse.json({ data: frame })

    } catch (err: unknown) {
        console.error("/api/frames POST error detail:", err)
        const message = err instanceof Error ? err.message : "Internal server error"
        return NextResponse.json({
            error: message,
            stack: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.stack : undefined) : undefined
        }, { status: 500 })
    }
}
