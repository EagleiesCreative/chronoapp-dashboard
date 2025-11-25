import { NextResponse, NextRequest } from "next/server"
import { clerkClient, auth } from "@clerk/nextjs/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('orgId')

    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const client = await clerkClient()
    
    // Get all organization members
    const memberships = await client.organizations.getOrganizationMembershipList({ 
      organizationId: orgId 
    })

    // Transform memberships into a simpler format
    const members = (memberships.data || []).map((m) => ({
      id: m.publicUserData?.userId || '',
      name: `${m.publicUserData?.firstName || ''} ${m.publicUserData?.lastName || ''}`.trim() || m.publicUserData?.identifier || 'Unknown',
      email: m.publicUserData?.identifier || '',
      role: m.role,
    }))

    return NextResponse.json({ members })
  } catch (err) {
    console.error("/api/orgs/members GET error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
