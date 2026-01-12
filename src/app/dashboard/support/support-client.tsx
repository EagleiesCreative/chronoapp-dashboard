"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    IconTicket,
    IconFilter,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
import { Ticket, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "./schema"
import { NewTicketDialog } from "./new-ticket-dialog"

interface SupportClientProps {
    initialTickets: Ticket[]
}

export function SupportClient({ initialTickets }: SupportClientProps) {
    const router = useRouter()
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch with Radix UI components
    useEffect(() => {
        setMounted(true)
    }, [])

    // Filter tickets based on status
    const filteredTickets = initialTickets.filter((ticket) => {
        if (statusFilter === "all") return true
        return ticket.status === statusFilter
    })

    const getCategoryLabel = (value: string) => {
        return TICKET_CATEGORIES.find(c => c.value === value)?.label || value
    }

    const getPriorityConfig = (value: string) => {
        return TICKET_PRIORITIES.find(p => p.value === value) || TICKET_PRIORITIES[0]
    }

    const getStatusConfig = (value: string) => {
        return TICKET_STATUSES.find(s => s.value === value) || TICKET_STATUSES[0]
    }

    const handleRowClick = (ticketId: string) => {
        router.push(`/dashboard/support/${ticketId}`)
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
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Support Tickets
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        View and manage your support requests
                    </p>
                </div>
                <NewTicketDialog />
            </div>

            {/* Filters */}
            <Card className="border-2 border-dashed">
                <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex items-center gap-2">
                            <IconFilter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Filter by status:</span>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tickets</SelectItem>
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
                    </div>
                </CardContent>
            </Card>

            {/* Tickets Table */}
            {filteredTickets.length > 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">Ticket ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="w-[120px]">Category</TableHead>
                                    <TableHead className="w-[100px]">Priority</TableHead>
                                    <TableHead className="w-[120px]">Status</TableHead>
                                    <TableHead className="w-[120px] text-right">Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTickets.map((ticket) => {
                                    const priorityConfig = getPriorityConfig(ticket.priority)
                                    const statusConfig = getStatusConfig(ticket.status)

                                    return (
                                        <TableRow
                                            key={ticket.id}
                                            className="cursor-pointer transition-colors hover:bg-muted/50"
                                            onClick={() => handleRowClick(ticket.id)}
                                        >
                                            <TableCell className="font-mono text-sm text-muted-foreground">
                                                {ticket.ticket_number}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {ticket.title}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {getCategoryLabel(ticket.category)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={`${priorityConfig.color} text-white text-xs`}
                                                >
                                                    {priorityConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={`${statusConfig.color} text-white text-xs`}
                                                >
                                                    {statusConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : initialTickets.length > 0 ? (
                // No results from filtering
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <IconFilter className="h-12 w-12 mb-4 text-muted-foreground/30" />
                        <h3 className="font-semibold text-lg mb-2">No matching tickets</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                            Try adjusting your filter to find what you&apos;re looking for.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                // No tickets at all
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

            {/* Stats Footer */}
            {initialTickets.length > 0 && (
                <div className="flex justify-center">
                    <p className="text-xs text-muted-foreground">
                        Showing {filteredTickets.length} of {initialTickets.length} tickets
                    </p>
                </div>
            )}
        </div>
    )
}
