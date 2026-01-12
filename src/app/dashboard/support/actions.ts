'use server'

import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { newTicketSchema, replySchema, NewTicketFormValues, ReplyFormValues, Ticket, TicketWithMessages } from "./schema"
import { revalidatePath } from "next/cache"
import { sanitizeText, sanitizeHtml } from "@/lib/sanitize"

// Generate ticket number in format TKT-XXXXX
function generateTicketNumber(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'TKT-'
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Ensure unique ticket number
async function ensureUniqueTicketNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
        const ticketNumber = generateTicketNumber()
        const { data } = await supabase
            .from('tickets')
            .select('id')
            .eq('ticket_number', ticketNumber)
            .maybeSingle()

        if (!data) return ticketNumber
    }
    // Fallback with timestamp
    return `TKT-${Date.now().toString(36).toUpperCase().slice(-5)}`
}

// Get all tickets for the current user
export async function getTickets(status?: string): Promise<Ticket[]> {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    let query = supabase
        .from('tickets')
        .select(`
      *,
      booth:booths(id, name)
    `)
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (status && status !== 'all') {
        query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
        console.error("Failed to fetch tickets:", error)
        throw new Error("Failed to fetch tickets")
    }

    return data || []
}

// Get ticket detail with messages
export async function getTicketDetail(ticketId: string): Promise<TicketWithMessages | null> {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
      *,
      booth:booths(id, name)
    `)
        .eq('id', ticketId)
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .single()

    if (ticketError || !ticket) {
        console.error("Failed to fetch ticket:", ticketError)
        return null
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

    if (messagesError) {
        console.error("Failed to fetch messages:", messagesError)
        throw new Error("Failed to fetch ticket messages")
    }

    return {
        ...ticket,
        messages: messages || []
    }
}

// Create a new ticket
export async function createTicket(data: NewTicketFormValues) {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    const validatedFields = newTicketSchema.safeParse(data)

    if (!validatedFields.success) {
        throw new Error("Invalid fields: " + validatedFields.error.issues.map(e => e.message).join(", "))
    }

    const { title, category, priority, booth_id, description } = validatedFields.data

    // Sanitize content
    const sanitizedTitle = sanitizeText(title)
    const sanitizedDescription = sanitizeHtml(description)

    // Generate unique ticket number
    const ticketNumber = await ensureUniqueTicketNumber()

    const { data: ticket, error } = await supabase
        .from('tickets')
        .insert([{
            organization_id: orgId,
            user_id: userId,
            booth_id: booth_id || null,
            ticket_number: ticketNumber,
            title: sanitizedTitle,
            description: sanitizedDescription,
            category,
            priority,
            status: 'open',
        }])
        .select()
        .single()

    if (error) {
        console.error("Failed to create ticket:", error)
        throw new Error("Failed to create ticket")
    }

    // Add initial message (the description) to ticket_messages
    await supabase
        .from('ticket_messages')
        .insert([{
            ticket_id: ticket.id,
            sender_id: userId,
            sender_type: 'user',
            message: sanitizedDescription,
            attachments: [],
        }])

    revalidatePath('/dashboard/support')
    return { success: true, ticket }
}

// Add reply to ticket
export async function addReply(ticketId: string, data: ReplyFormValues) {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    const validatedFields = replySchema.safeParse(data)

    if (!validatedFields.success) {
        throw new Error("Invalid message: " + validatedFields.error.issues.map(e => e.message).join(", "))
    }

    // Verify ticket belongs to user
    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('id', ticketId)
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .single()

    if (ticketError || !ticket) {
        throw new Error("Ticket not found")
    }

    if (ticket.status === 'closed') {
        throw new Error("Cannot reply to a closed ticket")
    }

    const sanitizedMessage = sanitizeHtml(validatedFields.data.message)

    // Add message
    const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert([{
            ticket_id: ticketId,
            sender_id: userId,
            sender_type: 'user',
            message: sanitizedMessage,
            attachments: [],
        }])

    if (messageError) {
        console.error("Failed to add reply:", messageError)
        throw new Error("Failed to add reply")
    }

    // Update ticket status to waiting_reply and updated_at
    await supabase
        .from('tickets')
        .update({
            status: 'waiting_reply',
            updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

    revalidatePath(`/dashboard/support/${ticketId}`)
    return { success: true }
}

// Update ticket status
export async function updateTicketStatus(ticketId: string, status: string) {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    // Verify ticket belongs to user
    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .single()

    if (ticketError || !ticket) {
        throw new Error("Ticket not found")
    }

    const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
    }

    if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)

    if (error) {
        console.error("Failed to update ticket status:", error)
        throw new Error("Failed to update ticket status")
    }

    revalidatePath(`/dashboard/support/${ticketId}`)
    revalidatePath('/dashboard/support')
    return { success: true }
}

// Get user's booths for dropdown
export async function getUserBooths() {
    const { userId, orgId, orgRole } = await auth()

    if (!userId || !orgId) {
        throw new Error("Not authenticated")
    }

    let query = supabase
        .from('booths')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })

    // If not admin, only show assigned booths
    if (orgRole !== 'org:admin') {
        query = query.eq('assigned_to', userId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Failed to fetch booths:", error)
        return []
    }

    return data || []
}
