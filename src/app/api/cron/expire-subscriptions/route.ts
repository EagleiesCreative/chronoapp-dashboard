import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-server"

/**
 * GET /api/cron/expire-subscriptions
 *
 * Vercel Cron Job — runs nightly at 01:00 UTC (08:00 WIB).
 * Finds all booths whose subscription has expired and downgrades them
 * back to the free 'growth' plan automatically.
 *
 * Secured via CRON_SECRET (same pattern as cleanup-photos).
 */
export async function GET(request: Request) {
    // 1. Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error("expire-subscriptions: Unauthorized invocation attempt.")
        return new Response("Unauthorized", { status: 401 })
    }

    console.log("expire-subscriptions: Starting subscription expiry check...")

    const now = new Date().toISOString()

    try {
        // 2. Find all booths with expired subscriptions that haven't been downgraded yet.
        //    We look for:
        //      - subscription_expires_at is in the past
        //      - subscription_plan is NOT 'growth' (already on free tier)
        //      - subscription_status is 'active' OR 'cancelled' (not already 'expired')
        const { data: expiredBooths, error: fetchError } = await supabase
            .from("booths")
            .select("id, organization_id, name, subscription_plan, subscription_status, subscription_expires_at")
            .lt("subscription_expires_at", now)
            .neq("subscription_plan", "growth")
            .in("subscription_status", ["active", "cancelled"])

        if (fetchError) {
            console.error("expire-subscriptions: Failed to fetch expired booths:", fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!expiredBooths || expiredBooths.length === 0) {
            console.log("expire-subscriptions: No expired subscriptions found.")
            return NextResponse.json({ message: "No expired subscriptions to process", processed: 0 })
        }

        console.log(`expire-subscriptions: Found ${expiredBooths.length} booth(s) to downgrade.`)

        const processed: string[] = []
        const failed: string[] = []

        for (const booth of expiredBooths) {
            try {
                // 3. Downgrade booth to free growth plan
                const { error: updateError } = await supabase
                    .from("booths")
                    .update({
                        subscription_plan: "growth",
                        subscription_status: "expired",
                        subscription_expires_at: null,
                    })
                    .eq("id", booth.id)

                if (updateError) {
                    console.error(`expire-subscriptions: Failed to update booth ${booth.id}:`, updateError)
                    failed.push(booth.id)
                    continue
                }

                // 4. Log the expiry event to subscription history
                await supabase.from("subscription_history").insert({
                    organization_id: booth.organization_id,
                    plan_id: "growth",
                    previous_plan: booth.subscription_plan,
                    action: `expired_${booth.name.replace(/\s+/g, "")}`,
                    amount: 0,
                })

                console.log(`expire-subscriptions: ✓ Downgraded booth "${booth.name}" (${booth.id}) from ${booth.subscription_plan}`)
                processed.push(booth.id)
            } catch (err) {
                console.error(`expire-subscriptions: Error processing booth ${booth.id}:`, err)
                failed.push(booth.id)
            }
        }

        console.log(`expire-subscriptions: Done. Processed: ${processed.length}, Failed: ${failed.length}`)

        return NextResponse.json({
            message: "Subscription expiry job completed",
            processed: processed.length,
            failed: failed.length,
            processedIds: processed,
            ...(failed.length > 0 && { failedIds: failed }),
        })
    } catch (error: any) {
        console.error("expire-subscriptions: Critical error:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}
