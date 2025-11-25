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
        const { boothId, code, discountAmount, discountType, maxUses, expiresAt } = body

        const { userId, orgRole } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        // Only admins can create vouchers (optional restriction, can be removed if members should also create)
        // For now, let's assume members assigned to the booth can also create vouchers? 
        // Or sticking to the previous rule where members can't edit assignee, maybe they can manage vouchers?
        // Let's allow it for now, or check if they are assigned.
        // Simplest is to allow if authenticated for now, or check org membership.

        if (!boothId || !code || discountAmount === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
        const { id, code, discountAmount, discountType, maxUses, expiresAt } = body

        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        if (!id || !code || discountAmount === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

        if (!id) {
            return NextResponse.json({ error: "Voucher ID required" }, { status: 400 })
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
