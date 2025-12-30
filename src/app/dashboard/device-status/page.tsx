"use client"

import { useState, useEffect, useCallback } from "react"
import { useOrganization } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconRefresh, IconDeviceDesktop, IconWifi, IconWifiOff, IconClock } from "@tabler/icons-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

// Local proxy handles the external API call to avoid CORS

interface Device {
    booth_id: string
    booth_name: string
    location: string
    organization_id: string
    device_name: string
    device_ip: string
    status: string
    last_heartbeat: string | null
    last_login_at: string
    online_duration_seconds: number | null
}

interface Summary {
    total: number
    online: number
    offline: number
    never_connected: number
}

interface ApiResponse {
    success: boolean
    summary: Summary
    devices: Device[]
}

export default function DeviceStatusPage() {
    const { isLoaded, organization } = useOrganization()
    const [devices, setDevices] = useState<Device[]>([])
    const [summary, setSummary] = useState<Summary>({ total: 0, online: 0, offline: 0, never_connected: 0 })
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Helper: Calculate status based on last heartbeat provided by user requirements
    // Online: < 2 minutes ago
    // Offline: > 2 minutes ago or null
    const getCalculatedStatus = (lastHeartbeat: string | null) => {
        if (!lastHeartbeat) return 'never_connected'
        const heartbeatTime = new Date(lastHeartbeat).getTime()
        const diff = Date.now() - heartbeatTime
        const twoMinutes = 2 * 60 * 1000
        return diff < twoMinutes ? 'online' : 'offline'
    }

    // Helper: Calculate live summary based on our client-side logic
    // This overrides the server summary since we are applying specific business logic
    const calculateSummary = (currentDevices: Device[]): Summary => {
        const s = { total: currentDevices.length, online: 0, offline: 0, never_connected: 0 }
        currentDevices.forEach(d => {
            const status = getCalculatedStatus(d.last_heartbeat)
            if (status === 'online') s.online++
            else if (status === 'offline') s.offline++
            else s.never_connected++
        })
        return s
    }

    const fetchDevices = useCallback(async (isAutoRefresh = false) => {
        if (!organization?.id) return

        if (!isAutoRefresh) setLoading(true)
        else setIsRefreshing(true)

        try {
            // Use local proxy to avoid CORS
            const endpoint = `/api/admin/devices`

            const res = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json'
                },
                cache: 'no-store'
            })

            if (!res.ok) throw new Error("Failed to fetch devices")

            const data: ApiResponse = await res.json()

            if (data.success) {
                const fetchedDevices = data.devices || []
                setDevices(fetchedDevices)

                // Recalculate summary based on strict 2-minute rule
                setSummary(calculateSummary(fetchedDevices))

                setLastUpdated(new Date())
                if (!isAutoRefresh) toast.success("Device status updated")
            } else {
                throw new Error("API responded with success: false")
            }

        } catch (error) {
            console.error("Error fetching device status:", error)
            if (!isAutoRefresh) toast.error("Failed to update device status")
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [organization?.id])

    // Initial fetch and auto-refresh interval
    useEffect(() => {
        if (isLoaded && organization) {
            fetchDevices()

            // Auto-refresh every 30 seconds
            const interval = setInterval(() => {
                fetchDevices(true)
            }, 30000)

            return () => clearInterval(interval)
        }
    }, [isLoaded, organization, fetchDevices])

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Device Status</h1>
                    <p className="text-sm text-muted-foreground">
                        Monitor the real-time status of your connected Photo Booth devices.
                        <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            Auto-refresh: 30s
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <Button variant="outline" size="sm" onClick={() => fetchDevices(false)} disabled={loading || isRefreshing || !organization}>
                        <IconRefresh className={`h-4 w-4 mr-2 ${loading || isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                        <IconDeviceDesktop className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : summary.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Online</CardTitle>
                        <IconWifi className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loading ? "-" : summary.online}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Offline / Never Connected</CardTitle>
                        <IconWifiOff className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loading ? "-" : summary.offline + summary.never_connected}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connected Devices</CardTitle>
                    <CardDescription>
                        List of all registered devices and their current operational status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Booth Name</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Location</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Device IP</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Last Seen</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-muted-foreground">Loading devices...</td>
                                        </tr>
                                    ) : devices.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-muted-foreground">No devices found.</td>
                                        </tr>
                                    ) : (
                                        devices.map((device) => {
                                            const calculatedStatus = getCalculatedStatus(device.last_heartbeat)

                                            // Status Badge Variants
                                            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary"
                                            let badgeClass = ""
                                            let statusLabel = ""

                                            if (calculatedStatus === 'online') {
                                                badgeVariant = "default"
                                                badgeClass = "bg-green-500 hover:bg-green-600"
                                                statusLabel = "Online"
                                            } else if (calculatedStatus === 'offline') {
                                                badgeVariant = "destructive"
                                                statusLabel = "Offline"
                                            } else {
                                                badgeVariant = "outline"
                                                statusLabel = "Never"
                                            }

                                            return (
                                                <tr key={device.booth_id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 align-middle">
                                                        <Badge
                                                            variant={badgeVariant}
                                                            className={badgeClass}
                                                        >
                                                            {statusLabel}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4 align-middle font-medium">
                                                        {device.booth_name}
                                                        <span className="block text-xs text-muted-foreground">{device.device_name}</span>
                                                    </td>
                                                    <td className="p-4 align-middle">{device.location}</td>
                                                    <td className="p-4 align-middle font-mono text-xs">{device.device_ip || "-"}</td>
                                                    <td className="p-4 align-middle">
                                                        {device.last_heartbeat ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(device.last_heartbeat).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
