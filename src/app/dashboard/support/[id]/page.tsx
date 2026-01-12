import { getTicketDetail } from "../actions"
import { TicketDetailClient } from "./ticket-detail-client"
import { notFound } from "next/navigation"

interface TicketDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
    const { id } = await params
    const ticket = await getTicketDetail(id)

    if (!ticket) {
        notFound()
    }

    return <TicketDetailClient ticket={ticket} />
}
