import { auth } from "@clerk/nextjs/server"
import { getBroadcasts } from "./actions"
import { BroadcastClient } from "./broadcast-client"

export default async function BroadcastPage() {
    const { orgRole } = await auth()
    const isAdmin = orgRole === "org:admin"
    const broadcasts = await getBroadcasts()

    return (
        <BroadcastClient
            initialBroadcasts={broadcasts || []}
            isAdmin={isAdmin}
        />
    )
}
