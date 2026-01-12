import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasFeature } from '@/lib/features'

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const orgId = searchParams.get('orgId')
        const feature = searchParams.get('feature')

        if (!orgId || !feature) {
            return NextResponse.json({ error: 'Missing orgId or feature' }, { status: 400 })
        }

        const hasAccess = await hasFeature(orgId, feature as any)

        return NextResponse.json({ hasAccess })
    } catch (error) {
        console.error('Error checking feature:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
