import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase-server"

/**
 * GET /api/public/frames
 *
 * Public endpoint for standalone photobooth apps.
 * Authenticates using the booth's device_token (no Clerk session required).
 *
 * Query params:
 *   - booth_token (required): The device_token of the booth
 *   - session_id (optional): Filter frames by a specific booth_session_id
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const boothToken = searchParams.get("booth_token")
        const sessionId = searchParams.get("session_id")

        if (!boothToken) {
            return NextResponse.json({ error: "Missing booth_token" }, { status: 401 })
        }

        // 1. Verify booth by device_token — fetch subscription fields too
        const { data: booth, error: boothError } = await supabase
            .from("booths")
            .select("id, organization_id, name, status, booth_id, subscription_plan, subscription_status, subscription_expires_at")
            .eq("device_token", boothToken)
            .single()

        if (boothError || !booth) {
            return NextResponse.json({ error: "Invalid or unrecognized booth token" }, { status: 403 })
        }

        // Case-insensitive active check
        if (booth.status?.toUpperCase() !== "ACTIVE") {
            return NextResponse.json({ error: "Booth is not active" }, { status: 403 })
        }

        // 2. Subscription expiry enforcement
        //    If the booth has a paid plan and its expiry date has passed, block access
        //    and lazily downgrade the DB record so the next cron also picks it up cleanly.
        const isPaidPlan = booth.subscription_plan && booth.subscription_plan !== "growth"
        const hasExpired =
            isPaidPlan &&
            booth.subscription_expires_at &&
            new Date(booth.subscription_expires_at) < new Date()

        if (hasExpired) {
            // Lazy downgrade — don't await, fire-and-forget so we don't slow down the response
            supabase
                .from("booths")
                .update({ subscription_status: "expired", subscription_plan: "growth", subscription_expires_at: null })
                .eq("id", booth.id)
                .then(() => console.log(`/api/public/frames: lazily expired booth ${booth.id}`))
                .catch((e) => console.error("/api/public/frames: lazy expiry update failed", e))

            return NextResponse.json(
                { error: "Subscription expired. Please renew your plan at framrstudio.com/billing" },
                { status: 402 }
            )
        }

        // 2. Build query: frames for this specific booth OR org-wide public frames
        let query = supabase
            .from("frames")
            .select("id, name, image_url, photo_slots, canvas_width, canvas_height, price, is_active, booth_id, booth_session_id")
            .eq("organization_id", booth.organization_id)
            .eq("is_active", true)

        // Narrow by booth_id: either frames assigned to THIS booth or public (no booth assigned)
        query = query.or(`booth_id.eq.${booth.id},booth_id.is.null`)

        // Narrow by session_id if provided
        if (sessionId) {
            query = query.or(`booth_session_id.eq.${sessionId},booth_session_id.is.null`)
        }

        const { data: frames, error } = await query.order("created_at", { ascending: false })

        if (error) {
            console.error("/api/public/frames GET error", error)
            return NextResponse.json({ error: "Failed to fetch frames" }, { status: 500 })
        }

        return NextResponse.json({
            booth: {
                id: booth.id,
                name: booth.name,
                booth_id: booth.booth_id,
            },
            frames: frames || [],
        })
    } catch (err: any) {
        console.error("/api/public/frames GET error", err)
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
    }
}
