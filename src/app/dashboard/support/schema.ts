import { z } from "zod"

// Category and Priority types
export const TICKET_CATEGORIES = [
    { value: "technical", label: "Technical Issue" },
    { value: "billing", label: "Billing & Payments" },
    { value: "account", label: "Account" },
    { value: "feature", label: "Feature Request" },
    { value: "other", label: "Other" },
] as const

export const TICKET_PRIORITIES = [
    { value: "low", label: "Low", color: "bg-gray-500" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
] as const

export const TICKET_STATUSES = [
    { value: "open", label: "Open", color: "bg-yellow-500" },
    { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
    { value: "waiting_reply", label: "Waiting Reply", color: "bg-purple-500" },
    { value: "resolved", label: "Resolved", color: "bg-green-500" },
    { value: "closed", label: "Closed", color: "bg-gray-500" },
] as const

export type TicketCategory = typeof TICKET_CATEGORIES[number]["value"]
export type TicketPriority = typeof TICKET_PRIORITIES[number]["value"]
export type TicketStatus = typeof TICKET_STATUSES[number]["value"]

// Ticket interface
export interface Ticket {
    id: string
    organization_id: string
    user_id: string
    booth_id: string | null
    ticket_number: string
    title: string
    description: string
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    created_at: string
    updated_at: string
    resolved_at: string | null
    // Joined data
    booth?: {
        id: string
        name: string
    } | null
}

// Ticket message interface
export interface TicketMessage {
    id: string
    ticket_id: string
    sender_id: string
    sender_type: "user" | "admin"
    message: string
    attachments: Array<{
        url: string
        name: string
        type: string
        size: number
    }>
    created_at: string
    // Joined data
    sender_name?: string
}

// Ticket with messages
export interface TicketWithMessages extends Ticket {
    messages: TicketMessage[]
}

// Validation limits
export const LIMITS = {
    MIN_TITLE_LENGTH: 5,
    MAX_TITLE_LENGTH: 100,
    MIN_DESCRIPTION_LENGTH: 20,
    MAX_DESCRIPTION_LENGTH: 2000,
    MIN_MESSAGE_LENGTH: 1,
    MAX_MESSAGE_LENGTH: 1000,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
}

// New ticket form schema
export const newTicketSchema = z.object({
    title: z
        .string()
        .min(LIMITS.MIN_TITLE_LENGTH, `Title must be at least ${LIMITS.MIN_TITLE_LENGTH} characters`)
        .max(LIMITS.MAX_TITLE_LENGTH, `Title must be at most ${LIMITS.MAX_TITLE_LENGTH} characters`),
    category: z.enum(["technical", "billing", "account", "feature", "other"]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    booth_id: z.string().optional(),
    description: z
        .string()
        .min(LIMITS.MIN_DESCRIPTION_LENGTH, `Description must be at least ${LIMITS.MIN_DESCRIPTION_LENGTH} characters`)
        .max(LIMITS.MAX_DESCRIPTION_LENGTH, `Description must be at most ${LIMITS.MAX_DESCRIPTION_LENGTH} characters`),
})

export type NewTicketFormValues = z.infer<typeof newTicketSchema>

// Reply form schema
export const replySchema = z.object({
    message: z
        .string()
        .min(LIMITS.MIN_MESSAGE_LENGTH, "Message is required")
        .max(LIMITS.MAX_MESSAGE_LENGTH, `Message must be at most ${LIMITS.MAX_MESSAGE_LENGTH} characters`),
})

export type ReplyFormValues = z.infer<typeof replySchema>
