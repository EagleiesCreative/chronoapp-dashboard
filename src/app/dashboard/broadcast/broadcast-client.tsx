"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconMail, IconSearch, IconFilter } from "@tabler/icons-react"
import { markAsRead } from "./actions"
import { ComposeDialog } from "./compose-dialog"
import { BroadcastCard } from "./broadcast-card"

interface Broadcast {
    id: string
    subject: string
    message: string
    priority: "low" | "medium" | "high"
    created_at: string
    sender_id?: string
}

interface BroadcastClientProps {
    initialBroadcasts: Broadcast[]
    isAdmin: boolean
}

type PriorityFilter = "all" | "high" | "medium" | "low"

export function BroadcastClient({ initialBroadcasts, isAdmin }: BroadcastClientProps) {
    const { isLoaded: orgLoaded, organization } = useOrganization()
    const { isLoaded: userLoaded } = useUser()
    const [searchQuery, setSearchQuery] = useState("")
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")

    useEffect(() => {
        if (orgLoaded && userLoaded) {
            markAsRead().catch(err => console.error("Failed to mark read:", err))
        }
    }, [orgLoaded, userLoaded])

    if (!orgLoaded || !userLoaded) {
        return (
            <div className="p-4 md:p-6 space-y-4">
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            </div>
        )
    }

    // Filter broadcasts based on search and priority
    const filteredBroadcasts = initialBroadcasts.filter((broadcast) => {
        const matchesSearch =
            searchQuery === "" ||
            broadcast.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            broadcast.message.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesPriority =
            priorityFilter === "all" || broadcast.priority === priorityFilter

        return matchesSearch && matchesPriority
    })

    // Count broadcasts by priority for badges
    const priorityCounts = {
        all: initialBroadcasts.length,
        high: initialBroadcasts.filter(b => b.priority === "high").length,
        medium: initialBroadcasts.filter(b => b.priority === "medium").length,
        low: initialBroadcasts.filter(b => b.priority === "low").length,
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Broadcasts
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin
                            ? `Manage broadcast messages for ${organization?.name}`
                            : `View announcements from ${organization?.name}`}
                    </p>
                </div>
                {isAdmin && (
                    <ComposeDialog organizationName={organization?.name || "your organization"} />
                )}
            </div>

            {/* Filters and Search */}
            <Card className="border-2 border-dashed">
                <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search broadcasts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Priority Filter Tabs */}
                        <Tabs value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
                            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                                <TabsTrigger value="all" className="text-xs sm:text-sm">
                                    All
                                    {priorityCounts.all > 0 && (
                                        <span className="ml-1 text-xs opacity-70">({priorityCounts.all})</span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="high" className="text-xs sm:text-sm">
                                    <span className="hidden sm:inline mr-1">🔴</span> High
                                    {priorityCounts.high > 0 && (
                                        <span className="ml-1 text-xs opacity-70">({priorityCounts.high})</span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="medium" className="text-xs sm:text-sm">
                                    <span className="hidden sm:inline mr-1">🟡</span> Med
                                    {priorityCounts.medium > 0 && (
                                        <span className="ml-1 text-xs opacity-70">({priorityCounts.medium})</span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="low" className="text-xs sm:text-sm">
                                    <span className="hidden sm:inline mr-1">🟢</span> Low
                                    {priorityCounts.low > 0 && (
                                        <span className="ml-1 text-xs opacity-70">({priorityCounts.low})</span>
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>

            {/* Broadcasts List */}
            <div className="space-y-4">
                {filteredBroadcasts.length > 0 ? (
                    filteredBroadcasts.map((broadcast) => (
                        <BroadcastCard key={broadcast.id} broadcast={broadcast} />
                    ))
                ) : initialBroadcasts.length > 0 ? (
                    // No results from filtering
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <IconFilter className="h-12 w-12 mb-4 text-muted-foreground/30" />
                            <h3 className="font-semibold text-lg mb-2">No matching broadcasts</h3>
                            <p className="text-muted-foreground text-sm max-w-sm">
                                Try adjusting your search or filter criteria to find what you&apos;re looking for.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    // No broadcasts at all
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 mb-6">
                                <IconMail className="h-12 w-12 text-blue-500" />
                            </div>
                            <h3 className="font-semibold text-xl mb-2">No broadcasts yet</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mb-6">
                                {isAdmin
                                    ? "Start communicating with your team by creating your first broadcast message."
                                    : "When your organization admins send broadcast messages, they will appear here."}
                            </p>
                            {isAdmin && (
                                <ComposeDialog organizationName={organization?.name || "your organization"} />
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Stats Footer */}
            {initialBroadcasts.length > 0 && (
                <div className="flex justify-center">
                    <p className="text-xs text-muted-foreground">
                        Showing {filteredBroadcasts.length} of {initialBroadcasts.length} broadcasts
                    </p>
                </div>
            )}
        </div>
    )
}
