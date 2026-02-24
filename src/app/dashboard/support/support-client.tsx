"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    IconTicket,
    IconFilter,
} from "@tabler/icons-react"
import { formatDistanceToNow, format } from "date-fns"
import { Ticket, TicketWithMessages, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "./schema"
import { NewTicketDialog } from "./new-ticket-dialog"
import { addReply } from "./actions"

interface SupportClientProps {
    initialTickets: Ticket[]
}

export function SupportClient({ initialTickets }: SupportClientProps) {
    const router = useRouter()
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [priorityFilter, setPriorityFilter] = useState<string>("all")
    const [mounted, setMounted] = useState(false)

    // Panel state
    const [selectedTicket, setSelectedTicket] = useState<TicketWithMessages | null>(null)
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [loadingDetail, setLoadingDetail] = useState(false)

    // Comment state
    const [newComment, setNewComment] = useState("")
    const [isPending, startTransition] = useTransition()

    // Prevent hydration mismatch with Radix UI components
    useEffect(() => {
        setMounted(true)
    }, [])

    // Filter tickets based on status and priority
    const filteredTickets = initialTickets.filter((ticket) => {
        if (statusFilter !== "all" && ticket.status !== statusFilter) return false
        if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false
        return true
    })

    const getPriorityConfig = (value: string) => {
        return TICKET_PRIORITIES.find(p => p.value === value) || TICKET_PRIORITIES[0]
    }

    const getStatusConfig = (value: string) => {
        return TICKET_STATUSES.find(s => s.value === value) || TICKET_STATUSES[0]
    }

    const handleRowClick = async (ticket: Ticket) => {
        setIsPanelOpen(true)
        setLoadingDetail(true)
        try {
            const res = await fetch(`/api/support/${ticket.id}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedTicket(data)
            } else {
                toast.error("Failed to load ticket details")
            }
        } catch (err) {
            toast.error("An error occurred loading details")
        } finally {
            setLoadingDetail(false)
        }
    }

    const handleSendComment = () => {
        if (!selectedTicket || !newComment.trim()) return
        startTransition(async () => {
            try {
                // Call server action to add reply
                await addReply(selectedTicket.id, { message: newComment })
                setNewComment("")
                toast.success("Comment sent!")

                // Refresh the panel data inline without closing it
                handleRowClick(selectedTicket)
                // Refresh the list if needed
                router.refresh()
            } catch (error) {
                console.error("Reply error:", error)
                toast.error(error instanceof Error ? error.message : "Failed to send comment")
            }
        })
    }

    // Show loading skeleton until client-side hydration is complete
    if (!mounted) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="h-12 w-64 animate-pulse rounded bg-muted" />
                <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        Tickets
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Track and resolve device issues.
                    </p>
                </div>
                <NewTicketDialog />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {TICKET_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                                <span className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${status.color}`} />
                                    {status.label}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        {TICKET_PRIORITIES.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                                {priority.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tickets Table */}
            {filteredTickets.length > 0 ? (
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead className="w-[150px]">Device</TableHead>
                                <TableHead className="w-[100px]">Priority</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTickets.map((ticket) => {
                                const priorityConfig = getPriorityConfig(ticket.priority)
                                const isSelected = selectedTicket?.id === ticket.id && isPanelOpen

                                return (
                                    <TableRow
                                        key={ticket.id}
                                        className={`h-16 cursor-pointer transition-colors ${isSelected ? 'bg-muted/80' : 'hover:bg-muted/50'}`}
                                        onClick={() => handleRowClick(ticket)}
                                    >
                                        <TableCell className="px-4 text-sm font-medium text-muted-foreground">
                                            {ticket.ticket_number}
                                        </TableCell>
                                        <TableCell className="font-bold cursor-pointer">
                                            {ticket.title}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {ticket.booth?.name || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-medium bg-background whitespace-nowrap">
                                                {priorityConfig.label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : initialTickets.length > 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <IconFilter className="h-12 w-12 mb-4 text-muted-foreground/30" />
                        <h3 className="font-semibold text-lg mb-2">No matching tickets</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                            Try adjusting your filters to find what you&apos;re looking for.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 mb-6">
                            <IconTicket className="h-12 w-12 text-purple-500" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2">No support tickets yet</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mb-6">
                            Need help? Create a support ticket and our team will assist you.
                        </p>
                        <NewTicketDialog />
                    </CardContent>
                </Card>
            )}

            {/* Slide-out Detail Panel */}
            <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
                <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-4 flex flex-col pt-12 sm:pt-4">
                    <SheetTitle className="sr-only">Ticket Details</SheetTitle>
                    <SheetDescription className="sr-only">View and manage support ticket details.</SheetDescription>
                    {loadingDetail ? (
                        <div className="flex flex-col h-full space-y-4 animate-pulse pt-4">
                            <div className="h-4 w-20 bg-muted rounded" />
                            <div className="h-8 w-3/4 bg-muted rounded" />
                            <div className="h-32 w-full bg-muted rounded mt-4" />
                            <div className="h-24 w-full bg-muted rounded" />
                            <div className="h-24 w-full bg-muted rounded" />
                        </div>
                    ) : selectedTicket ? (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <SheetHeader className="pb-4">
                                <div className="flex items-center justify-between pb-4 border-b">
                                    <span className="font-semibold text-foreground tracking-wide">{selectedTicket.ticket_number}</span>
                                </div>
                                <div className="pt-4 text-left">
                                    <h2 className="text-xl font-bold mb-3">{selectedTicket.title}</h2>
                                    <div className="flex items-center gap-3">
                                        <Badge className={`${getStatusConfig(selectedTicket.status).color} text-white hover:${getStatusConfig(selectedTicket.status).color}`}>
                                            {getStatusConfig(selectedTicket.status).label}
                                        </Badge>
                                        <Badge variant="outline" className="font-medium bg-background">
                                            {getPriorityConfig(selectedTicket.priority).label}
                                        </Badge>
                                    </div>
                                </div>
                            </SheetHeader>

                            {/* Description */}
                            <div className="mt-4 rounded-md bg-muted/60 p-4 border border-transparent">
                                <p className="text-sm whitespace-pre-wrap text-foreground">
                                    {selectedTicket.description}
                                </p>
                            </div>

                            {/* Metadata Grid */}
                            <div className="flex items-start gap-12 mt-6">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Device</p>
                                    <p className="text-sm font-medium">{selectedTicket.booth?.name || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Assignee</p>
                                    <p className="text-sm font-medium">—</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                                    <p className="text-sm font-medium">
                                        {format(new Date(selectedTicket.created_at), "MMM d, yyyy")}
                                    </p>
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="mt-6 border-t pt-4 flex-1">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    💬 Comments ({selectedTicket.messages?.length || 0})
                                </h3>
                                <div className="mt-4 space-y-3 pb-4">
                                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                        selectedTicket.messages.map((msg) => (
                                            <div key={msg.id} className="rounded-xl border bg-card p-4 shadow-sm">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold">{msg.sender_name || (msg.sender_type === 'user' ? 'You' : 'Support')}</span>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(msg.created_at), "MMM d, yyyy h:mm a")}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/90">{msg.message}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Start the conversation!</p>
                                    )}
                                </div>
                            </div>

                            {/* Comment Input */}
                            {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
                                <div className="mt-4 pt-4 border-t sticky bottom-0 bg-background flex items-center gap-2">
                                    <Input
                                        placeholder="Add a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newComment.trim() && !isPending) {
                                                handleSendComment()
                                            }
                                        }}
                                        className="flex-1"
                                        disabled={isPending}
                                    />
                                    <Button
                                        onClick={handleSendComment}
                                        disabled={!newComment.trim() || isPending}
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        Send
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </SheetContent>
            </Sheet>
        </div>
    )
}
