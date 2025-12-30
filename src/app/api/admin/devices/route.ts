import { NextResponse, NextRequest } from "next/server"

// The base URL from env (NEXT_PUBLIC_ so it can be shared, but this runs server-side)
const BASE_URL = process.env.NEXT_PUBLIC_DEVICE_API_URL || "https://dev.eagleies.com/api"
// API Key - use server-side env var (no NEXT_PUBLIC_ prefix for security)
// Falls back to NEXT_PUBLIC_ version if the server-only version isn't set
const API_KEY = process.env.DEVICE_API_KEY || process.env.NEXT_PUBLIC_DEVICE_API_KEY || ""

export async function GET(req: NextRequest) {
    try {
        // Construct the external URL
        const baseUrlClean = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL
        const endpoint = `${baseUrlClean}/admin/devices`

        console.log(`Proxying request to: ${endpoint}`)

        const res = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(API_KEY ? { "X-API-Key": API_KEY } : {})
            },
            // cache: 'no-store' // Ensure we get fresh data
        })

        if (!res.ok) {
            console.error(`External API error: ${res.status} ${res.statusText}`)
            return NextResponse.json(
                { error: `Failed to fetch from external API: ${res.statusText}` },
                { status: res.status }
            )
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error("Proxy error:", error)
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
