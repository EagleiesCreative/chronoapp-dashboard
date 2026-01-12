"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import {
    IconArrowLeft,
    IconLoader,
    IconSend,
    IconCheck,
    IconCalendar,
    IconCategory,
    IconBuildingStore,
} from "@tabler/icons-react"
import { formatDistanceToNow, format } from "date-fns"
import {
    TicketWithMessages,
    TICKET_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    replySchema,
    ReplyFormValues,
    LIMITS,
} from "../schema"
import { addReply, updateTicketStatus } from "../actions"

interface TicketDetailClientProps {
    ticket: TicketWithMessages
}

export function TicketDetailClient({ ticket }: TicketDetailClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isResolving, setIsResolving] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch with Radix UI components
    useEffect(() => {
        setMounted(true)
    }, [])

    const form = useForm<ReplyFormValues>({
        resolver: zodResolver(replySchema),
        defaultValues: {
            message: "",
        },
    })

    const watchMessage = form.watch("message")
    const messageLength = watchMessage?.length || 0

    const getCategoryLabel = (value: string) => {
        return TICKET_CATEGORIES.find(c => c.value === value)?.label || value
    }

    const getPriorityConfig = (value: string) => {
        return TICKET_PRIORITIES.find(p => p.value === value) || TICKET_PRIORITIES[0]
    }

    const getStatusConfig = (value: string) => {
        return TICKET_STATUSES.find(s => s.value === value) || TICKET_STATUSES[0]
    }

    const priorityConfig = getPriorityConfig(ticket.priority)
    const statusConfig = getStatusConfig(ticket.status)

    const handleSubmitReply = (data: ReplyFormValues) => {
        startTransition(async () => {
            try {
                await addReply(ticket.id, data)
                toast.success("Reply sent!")
                form.reset()
                router.refresh()
            } catch (error) {
                console.error("Reply error:", error)
                toast.error(error instanceof Error ? error.message : "Failed to send reply")
            }
        })
    }

    const handleMarkResolved = () => {
        setIsResolving(true)
        startTransition(async () => {
            try {
                await updateTicketStatus(ticket.id, "resolved")
                toast.success("Ticket marked as resolved!")
                router.refresh()
            } catch (error) {
                console.error("Resolve error:", error)
                toast.error(error instanceof Error ? error.message : "Failed to resolve ticket")
            } finally {
                setIsResolving(false)
            }
        })
    }

    const canReply = ticket.status !== "closed" && ticket.status !== "resolved"
    const canResolve = ticket.status === "open" || ticket.status === "in_progress" || ticket.status === "waiting_reply"

    // Show loading skeleton until client-side hydration is complete
    if (!mounted) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
            {/* Back button */}
            <Link
                href="/dashboard/support"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
                <IconArrowLeft className="h-4 w-4" />
                Back to tickets
            </Link>

            {/* Ticket Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-muted-foreground">
                            {ticket.ticket_number}
                        </span>
                        <Badge className={`${statusConfig.color} text-white`}>
                            {statusConfig.label}
                        </Badge>
                        <Badge className={`${priorityConfig.color} text-white`}>
                            {priorityConfig.label}
                        </Badge>
                    </div>
                    <h1 className="text-2xl font-bold">{ticket.title}</h1>
                </div>
                {canResolve && (
                    <Button
                        variant="outline"
                        className="gap-2 border-green-500/50 text-green-500 hover:bg-green-500/10"
                        onClick={handleMarkResolved}
                        disabled={isResolving}
                    >
                        {isResolving ? (
                            <IconLoader className="h-4 w-4 animate-spin" />
                        ) : (
                            <IconCheck className="h-4 w-4" />
                        )}
                        Mark as Resolved
                    </Button>
                )}
            </div>

            {/* Ticket Info Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <IconCategory className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Category</p>
                                <p className="text-sm font-medium">{getCategoryLabel(ticket.category)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <IconCalendar className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Created</p>
                                <p className="text-sm font-medium">
                                    {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                            </div>
                        </div>
                        {ticket.booth && (
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <IconBuildingStore className="h-4 w-4 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Related Booth</p>
                                    <p className="text-sm font-medium">{ticket.booth.name}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Conversation Thread */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {ticket.messages.length > 0 ? (
                        ticket.messages.map((message) => {
                            const isUser = message.sender_type === "user"
                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-4 ${isUser
                                            ? "bg-purple-500/20 border border-purple-500/30"
                                            : "bg-muted"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-medium ${isUser ? "text-purple-400" : "text-muted-foreground"}`}>
                                                {isUser ? "You" : "Support Team"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                                        {message.attachments && message.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {message.attachments.map((attachment, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-purple-400 hover:underline"
                                                    >
                                                        📎 {attachment.name}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            No messages yet.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Reply Form */}
            {canReply && (
                <Card>
                    <CardContent className="pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmitReply)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Add a reply</span>
                                                <span className={`text-xs ${messageLength > LIMITS.MAX_MESSAGE_LENGTH * 0.9 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                    {messageLength}/{LIMITS.MAX_MESSAGE_LENGTH}
                                                </span>
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Type your message here..."
                                                    className="min-h-[100px] resize-none"
                                                    disabled={isPending}
                                                    maxLength={LIMITS.MAX_MESSAGE_LENGTH}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={isPending || !watchMessage?.trim()}
                                        className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    >
                                        {isPending ? (
                                            <>
                                                <IconLoader className="h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <IconSend className="h-4 w-4" />
                                                Send Reply
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {/* Closed ticket notice */}
            {!canReply && (
                <Card className="border-dashed">
                    <CardContent className="py-6 text-center">
                        <p className="text-muted-foreground">
                            This ticket is {ticket.status}. You cannot add new replies.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
