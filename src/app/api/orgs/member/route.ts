import { NextResponse } from "next/server"
import { clerkClient, auth } from "@clerk/nextjs/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orgId, memberId, action, newRole } = body

    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    // Verify caller is an org admin
    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: orgId })
    const caller = memberships.data?.find((m) => m.publicUserData?.userId === userId)
    if (!caller || caller.role !== "org:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find the target member
    const members = await client.organizations.getOrganizationMembershipList({ organizationId: orgId })
    const target = members.data?.find((m) => m.id === memberId)
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })

    if (action === "updateRole") {
      const updated = await client.organizations.updateOrganizationMembership({ organizationId: orgId, userId: target.publicUserData?.userId || '', role: newRole })
      return NextResponse.json(updated)
    }

    if (action === "remove") {
      await client.organizations.deleteOrganizationMembership({ organizationId: orgId, userId: target.publicUserData?.userId || '' })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("/api/orgs/member error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
