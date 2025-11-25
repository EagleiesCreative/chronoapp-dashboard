import { NextResponse } from "next/server"
import { clerkClient, auth } from "@clerk/nextjs/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orgId, invitationId } = body

    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    // Verify caller is an org admin
    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: orgId })
    const caller = memberships.data?.find((m) => m.publicUserData?.userId === userId)
    if (!caller || caller.role !== "org:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Revoke invitation
    await client.organizations.revokeOrganizationInvitation({ organizationId: orgId, invitationId })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("/api/orgs/invite/revoke error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
