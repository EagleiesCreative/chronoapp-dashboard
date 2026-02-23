import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

// The base URL from env (server-side proxy to avoid CORS)
const BASE_URL = process.env.NEXT_PUBLIC_DEVICE_API_URL || "https://dev.eagleies.com/api"
// API Key - prefer server-only env var, fall back to NEXT_PUBLIC_ version
const API_KEY = process.env.DEVICE_API_KEY || process.env.NEXT_PUBLIC_DEVICE_API_KEY || ""

export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate with Clerk
        const { userId, orgId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // 2. Construct the external URL
        const baseUrlClean = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL
        const endpoint = `${baseUrlClean}/admin/devices`

        // 3. Fetch from external API
        const res = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(API_KEY ? { "X-API-Key": API_KEY } : {})
            },
            cache: 'no-store'
        })

        if (!res.ok) {
            const errorText = await res.text().catch(() => "Unknown error")
            console.error(`/api/admin/devices GET - External API error: ${res.status} ${res.statusText}`, errorText)

            // Return an empty but valid response so the page doesn't break
            return NextResponse.json({
                success: true,
                summary: { total: 0, online: 0, offline: 0, never_connected: 0 },
                devices: [],
                _warning: `External device API returned ${res.status}`
            })
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (error: any) {
        console.error("/api/admin/devices GET error:", error?.message || error)

        // Return empty valid response instead of error so page renders gracefully
        return NextResponse.json({
            success: true,
            summary: { total: 0, online: 0, offline: 0, never_connected: 0 },
            devices: [],
            _warning: "Device API is currently unavailable"
        })
    }
}
