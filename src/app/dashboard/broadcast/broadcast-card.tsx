"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import { escapeHtml } from "@/lib/sanitize"

interface BroadcastCardProps {
    broadcast: {
        id: string
        subject: string
        message: string
        priority: "low" | "medium" | "high"
        created_at: string
        sender_id?: string
    }
}

// Format relative time (e.g., "2 hours ago", "3 days ago")
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffSeconds < 60) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`
    if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Maximum characters to show before truncating
const MAX_PREVIEW_LENGTH = 200

export function BroadcastCard({ broadcast }: BroadcastCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const isLongMessage = broadcast.message.length > MAX_PREVIEW_LENGTH
    const displayMessage = isExpanded || !isLongMessage
        ? broadcast.message
        : broadcast.message.slice(0, MAX_PREVIEW_LENGTH) + "..."

    const getPriorityStyles = () => {
        switch (broadcast.priority) {
            case "high":
                return {
                    border: "border-red-500/50",
                    gradient: "bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent",
                    icon: "🔴",
                    badgeClass: "bg-red-500 hover:bg-red-600 text-white",
                    variant: "destructive" as const
                }
            case "medium":
                return {
                    border: "border-yellow-500/50",
                    gradient: "bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent",
                    icon: "🟡",
                    badgeClass: "bg-yellow-500 hover:bg-yellow-600 text-white",
                    variant: "default" as const
                }
            default:
                return {
                    border: "border-green-500/50",
                    gradient: "bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent",
                    icon: "🟢",
                    badgeClass: "bg-green-500 hover:bg-green-600 text-white",
                    variant: "secondary" as const
                }
        }
    }

    const styles = getPriorityStyles()

    return (
        <Card
            className={`
                relative overflow-hidden border-2 transition-all duration-300 
                hover:shadow-lg hover:shadow-${broadcast.priority === 'high' ? 'red' : broadcast.priority === 'medium' ? 'yellow' : 'green'}-500/10
                ${styles.border} ${styles.gradient}
            `}
        >
            {/* Priority accent bar */}
            <div className={`
                absolute top-0 left-0 w-1 h-full
                ${broadcast.priority === 'high' ? 'bg-red-500' : broadcast.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}
            `} />

            <CardContent className="pt-4 pl-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate pr-2">
                            {escapeHtml(broadcast.subject)}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge
                            variant={styles.variant}
                            className={styles.badgeClass}
                        >
                            {broadcast.priority.toUpperCase()}
                        </Badge>
                    </div>
                </div>

                {/* Message Content */}
                <div className="relative">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {escapeHtml(displayMessage)}
                    </p>

                    {isLongMessage && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-2 p-0 h-auto text-xs text-primary hover:text-primary/80 hover:bg-transparent"
                        >
                            {isExpanded ? (
                                <>
                                    <IconChevronUp className="h-3 w-3 mr-1" />
                                    Show less
                                </>
                            ) : (
                                <>
                                    <IconChevronDown className="h-3 w-3 mr-1" />
                                    Show more
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(broadcast.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {new Date(broadcast.created_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
