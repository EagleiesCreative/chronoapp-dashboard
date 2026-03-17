import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { sanitizeText } from "@/lib/sanitize"

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { userId, orgId, orgRole } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // Role check: Only admin can update frames
        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 })
        }

        const body = await req.json()
        const { name, photo_slots, is_active, price, dimensions, booth_id } = body

        // 1. Verify ownership (IDOR protection)
        const { data: existingFrame, error: fetchError } = await supabase
            .from('frames')
            .select('organization_id')
            .eq('id', id)
            .single()

        if (fetchError || !existingFrame) {
            return NextResponse.json({ error: "Frame not found" }, { status: 404 })
        }

        if (existingFrame.organization_id !== orgId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 404 })
        }

        // 2. Perform update
        const updateData: Record<string, string | number | boolean | unknown[] | null | undefined> = {}
        if (name !== undefined) updateData.name = sanitizeText(name)
        if (photo_slots !== undefined) updateData.photo_slots = photo_slots
        if (is_active !== undefined) updateData.is_active = is_active
        if (price !== undefined) updateData.price = price
        if (dimensions !== undefined) {
            updateData.canvas_width = dimensions.width
            updateData.canvas_height = dimensions.height
        }
        if (booth_id !== undefined) updateData.booth_id = booth_id

        const { data: updatedFrame, error: updateError } = await supabase
            .from('frames')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error("/api/frames/[id] PATCH error:", updateError)
            return NextResponse.json({ error: "Failed to update frame" }, { status: 500 })
        }

        return NextResponse.json({ data: updatedFrame })

    } catch (err: unknown) {
        console.error("/api/frames/[id] PATCH error", err)
        const message = err instanceof Error ? err.message : "Internal server error"
        return NextResponse.json({
            error: message
        }, { status: 500 })
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { userId, orgId, orgRole } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // Role check: Only admin can delete frames
        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 })
        }

        // 1. Verify ownership
        const { data: existingFrame, error: fetchError } = await supabase
            .from('frames')
            .select('organization_id')
            .eq('id', id)
            .single()

        if (fetchError || !existingFrame) {
            return NextResponse.json({ error: "Frame not found" }, { status: 404 })
        }

        if (existingFrame.organization_id !== orgId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 404 })
        }

        // 2. Perform delete
        const { error: deleteError } = await supabase
            .from('frames')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error("/api/frames/[id] DELETE error:", deleteError)
            return NextResponse.json({ error: "Failed to delete frame" }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (err: unknown) {
        console.error("/api/frames/[id] DELETE error", err)
        const message = err instanceof Error ? err.message : "Internal server error"
        return NextResponse.json({
            error: message
        }, { status: 500 })
    }
}
