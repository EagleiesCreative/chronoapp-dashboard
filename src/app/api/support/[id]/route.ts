import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const ticketId = (await params).id

        // Fetch ticket with booth details, scoped to org
        const { data: ticket, error } = await supabase
            .from('tickets')
            .select(`
                *,
                booth:booths(id, name)
            `)
            .eq('id', ticketId)
            .eq('organization_id', orgId)
            .single()

        if (error || !ticket) {
            console.error(`/api/support/[id] GET ticket error:`, error)
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
        }

        // Fetch messages for this ticket
        const { data: messages, error: messagesError } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true })

        if (messagesError) {
            console.error(`/api/support/[id] GET messages error:`, messagesError)
        }

        // Return ticket details combined with messages
        return NextResponse.json({
            ...ticket,
            messages: messages || []
        })
    } catch (err: any) {
        console.error(`/api/support/[id] GET error:`, err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
