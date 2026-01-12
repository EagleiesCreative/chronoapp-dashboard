'use server'

import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { broadcastSchema, BroadcastFormValues } from "./schema"
import { revalidatePath } from "next/cache"
import { sanitizeText, sanitizeHtml } from "@/lib/sanitize"

// Rate limiting: Store last broadcast time per user (in-memory for simplicity)
// In production, use Redis or database
const lastBroadcastTime: Map<string, number> = new Map()
const RATE_LIMIT_MS = 10000 // 10 seconds between broadcasts

export async function createBroadcast(data: BroadcastFormValues) {
    const { userId, orgId, orgRole } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    if (orgRole !== "org:admin") {
        throw new Error("Unauthorized: Only admins can send broadcasts")
    }

    // Rate limiting check
    const lastTime = lastBroadcastTime.get(userId)
    const now = Date.now()
    if (lastTime && now - lastTime < RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastTime)) / 1000)
        throw new Error(`Please wait ${remainingSeconds} seconds before sending another broadcast`)
    }

    const validatedFields = broadcastSchema.safeParse(data)

    if (!validatedFields.success) {
        throw new Error("Invalid fields: " + validatedFields.error.issues.map((e: { message: string }) => e.message).join(", "))
    }

    const { subject, message, priority } = validatedFields.data

    // Sanitize content to prevent XSS attacks
    const sanitizedSubject = sanitizeText(subject)
    const sanitizedMessage = sanitizeHtml(message)

    const { error } = await supabase
        .from('broadcasts')
        .insert([
            {
                subject: sanitizedSubject,
                message: sanitizedMessage,
                priority,
                sender_id: userId,
                organization_id: orgId,
            }
        ])

    if (error) {
        console.error("Supabase insert error:", error)
        throw new Error("Failed to send broadcast")
    }

    // Update rate limit timestamp
    lastBroadcastTime.set(userId, now)

    revalidatePath('/dashboard/broadcast')
    return { success: true }
}

export async function getBroadcasts() {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Supabase fetch error:", JSON.stringify(error, null, 2))
        console.error("Error code:", error.code)
        console.error("Error message:", error.message)
        console.error("Error details:", error.details)
        throw new Error(`Failed to fetch broadcasts: ${error.message || 'Unknown error'}`)
    }

    return data
}

export async function markAsRead() {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
        return { success: false, error: "Not authenticated" }
    }

    // 1. Get all broadcasts for the org
    const { data: broadcasts, error: broadcastError } = await supabase
        .from('broadcasts')
        .select('id')
        .eq('organization_id', orgId)

    if (broadcastError) {
        console.error("Supabase fetch error:", broadcastError)
        return { success: false, error: "Failed to fetch broadcasts" }
    }

    if (!broadcasts || broadcasts.length === 0) {
        return { success: true }
    }

    // 2. Insert into broadcast_reads, ignoring duplicates
    const readsToInsert = broadcasts.map(b => ({
        broadcast_id: b.id,
        user_id: userId,
        organization_id: orgId
    }))

    const { error: insertError } = await supabase
        .from('broadcast_reads')
        .upsert(readsToInsert, { onConflict: 'broadcast_id, user_id' })

    if (insertError) {
        console.error("Supabase upsert error:", insertError)
        return { success: false, error: "Failed to mark as read" }
    }

    return { success: true }
}
