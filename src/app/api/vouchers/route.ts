import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const boothId = searchParams.get('boothId')

        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        if (!boothId) {
            return NextResponse.json({ error: "Booth ID required" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('vouchers')
            .select('*')
            .eq('booth_id', boothId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('/api/vouchers GET error', error)
            return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 })
        }

        return NextResponse.json({ vouchers: data })
    } catch (err) {
        console.error("/api/vouchers GET error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { boothId, code, discountAmount, discountType, maxUses, expiresAt, orgId } = body

        const { userId, orgRole } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        if (!boothId || !code || discountAmount === undefined || !orgId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Check if organization has access to vouchers feature (Pro plan only)
        const { hasFeature, FEATURES } = await import('@/lib/features')
        const hasVouchers = await hasFeature(orgId, FEATURES.VOUCHERS)

        if (!hasVouchers) {
            return NextResponse.json({
                error: "Upgrade required",
                message: "Vouchers are only available on the Pro plan. Upgrade to create discount codes.",
                upgrade_required: true
            }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('vouchers')
            .insert({
                booth_id: boothId,
                code,
                discount_amount: discountAmount,
                discount_type: discountType || 'fixed',
                max_uses: maxUses || null,
                expires_at: expiresAt || null,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Voucher code already exists for this booth' }, { status: 409 })
            }
            console.error('/api/vouchers POST error', error)
            return NextResponse.json({ error: 'Failed to create voucher' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err) {
        console.error("/api/vouchers POST error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json()
        const { id, code, discountAmount, discountType, maxUses, expiresAt, orgId } = body

        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        if (!id || !code || discountAmount === undefined || !orgId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Check vouchers feature access
        const { hasFeature, FEATURES } = await import('@/lib/features')
        const hasVouchers = await hasFeature(orgId, FEATURES.VOUCHERS)

        if (!hasVouchers) {
            return NextResponse.json({
                error: "Upgrade required",
                message: "Vouchers are only available on the Pro plan.",
                upgrade_required: true
            }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('vouchers')
            .update({
                code,
                discount_amount: discountAmount,
                discount_type: discountType || 'fixed',
                max_uses: maxUses || null,
                expires_at: expiresAt || null,
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Voucher code already exists for this booth' }, { status: 409 })
            }
            console.error('/api/vouchers PUT error', error)
            return NextResponse.json({ error: 'Failed to update voucher' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err) {
        console.error("/api/vouchers PUT error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const orgId = searchParams.get('orgId')

        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        if (!id || !orgId) {
            return NextResponse.json({ error: "Voucher ID and orgId required" }, { status: 400 })
        }

        // Check vouchers feature access
        const { hasFeature, FEATURES } = await import('@/lib/features')
        const hasVouchers = await hasFeature(orgId, FEATURES.VOUCHERS)

        if (!hasVouchers) {
            return NextResponse.json({
                error: "Upgrade required",
                message: "Vouchers are only available on the Pro plan.",
                upgrade_required: true
            }, { status: 403 })
        }

        const { error } = await supabase
            .from('vouchers')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('/api/vouchers DELETE error', error)
            return NextResponse.json({ error: 'Failed to delete voucher' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error("/api/vouchers DELETE error", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
