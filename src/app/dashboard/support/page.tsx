import { getTickets } from "./actions"
import { SupportClient } from "./support-client"

export default async function SupportPage() {
    const tickets = await getTickets()

    return <SupportClient initialTickets={tickets} />
}
