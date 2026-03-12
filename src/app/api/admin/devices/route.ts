import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

const TWO_MINUTES_MS = 2 * 60 * 1000

function getCalculatedStatus(lastHeartbeat: string | null): 'online' | 'offline' | 'never_connected' {
    if (!lastHeartbeat) return 'never_connected'
    const diff = Date.now() - new Date(lastHeartbeat).getTime()
    return diff < TWO_MINUTES_MS ? 'online' : 'offline'
}

export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate with Clerk
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // 2. Query Supabase booths table (same source of truth as Booth Management)
        let query = supabase
            .from('booths')
            .select('id, name, location, organization_id, device_name, device_ip, status, last_heartbeat, last_login_at, booth_id')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        // Non-admin users only see their assigned booths
        if (orgRole !== 'org:admin') {
            query = query.eq('assigned_to', userId)
        }

        const { data: booths, error } = await query

        if (error) {
            console.error("/api/admin/devices GET supabase error:", error)
            return NextResponse.json({
                success: true,
                summary: { total: 0, online: 0, offline: 0, never_connected: 0 },
                devices: [],
                _warning: "Failed to fetch device data"
            })
        }

        // 3. Map booths to the Device shape expected by the frontend
        const devices = (booths || []).map(booth => ({
            booth_id: booth.booth_id || booth.id,
            booth_name: booth.name,
            location: booth.location || '',
            organization_id: booth.organization_id,
            device_name: booth.device_name || '',
            device_ip: booth.device_ip || '',
            status: getCalculatedStatus(booth.last_heartbeat),
            last_heartbeat: booth.last_heartbeat,
            last_login_at: booth.last_login_at || '',
            online_duration_seconds: null
        }))

        // 4. Calculate summary
        const summary = {
            total: devices.length,
            online: devices.filter(d => d.status === 'online').length,
            offline: devices.filter(d => d.status === 'offline').length,
            never_connected: devices.filter(d => d.status === 'never_connected').length
        }

        return NextResponse.json({
            success: true,
            summary,
            devices
        })

    } catch (err: any) {
        console.error("/api/admin/devices GET error:", err?.message || err)

        return NextResponse.json({
            success: true,
            summary: { total: 0, online: 0, offline: 0, never_connected: 0 },
            devices: [],
            _warning: "Device API is currently unavailable"
        })
    }
}
