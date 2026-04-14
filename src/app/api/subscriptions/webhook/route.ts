import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { PLANS, ADDONS, PlanId, AddonId } from '@/lib/pricing'

// Webhook handler for Xendit payment callbacks (subscription payments)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Verify webhook signature
        const webhookToken = req.headers.get('x-callback-token')
        const EXPECTED_TOKEN = process.env.XENDIT_WEBHOOK_SECRET

        // In production, always verify. In dev, allow if no token is configured.
        if (EXPECTED_TOKEN && webhookToken !== EXPECTED_TOKEN) {
            console.error('Invalid Xendit webhook token')
            return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 })
        }

        console.log('Subscription webhook received:', JSON.stringify(body, null, 2))

        const { external_id, status, paid_amount, payment_method, id: invoiceId } = body

        // external_id format: sub_{boothId}_{purchaseItem}_{timestamp}
        if (!external_id?.startsWith('sub_')) {
            return NextResponse.json({ message: 'Not a subscription payment' }, { status: 200 })
        }

        const parts = external_id.split('_')
        if (parts.length < 4) {
            return NextResponse.json({ error: 'Invalid external_id format' }, { status: 400 })
        }

        const boothId = parts[1]
        const purchaseItem = parts[2] // planId or addonId

        // Fetch original booth to get org_id and current addons
        const { data: booth } = await supabase
            .from('booths')
            .select('id, organization_id, name, addons')
            .eq('id', boothId)
            .single()

        if (!booth) {
             console.error(`Booth ${boothId} not found during webhook process`)
             return NextResponse.json({ error: 'Booth not found' }, { status: 404 })
        }

        const orgId = booth.organization_id

        if (status === 'PAID' || status === 'SETTLED') {
            const isPlan = Object.keys(PLANS).includes(purchaseItem)
            const isAddon = Object.keys(ADDONS).includes(purchaseItem)

            if (isPlan) {
                // Calculate expiration (30 days from now)
                const expiresAt = new Date()
                expiresAt.setDate(expiresAt.getDate() + 30)

                // Update booth subscription
                const { error: updateError } = await supabase
                    .from('booths')
                    .update({
                        subscription_plan: purchaseItem,
                        subscription_status: 'active',
                        subscription_expires_at: expiresAt.toISOString(),
                    })
                    .eq('id', boothId)

                if (updateError) throw updateError

                await supabase.from('subscription_history').insert({
                    organization_id: orgId,
                    plan_id: purchaseItem,
                    action: `upgraded_${booth.name.replace(/\s+/g, '')}`,
                    amount: paid_amount,
                    payment_method: payment_method || 'xendit',
                    payment_id: invoiceId || external_id,
                })
                
            } else if (isAddon) {
                // Determine new addons array
                const currentAddons = booth.addons || []
                const newAddons = [...new Set([...currentAddons, purchaseItem])]

                const { error: updateError } = await supabase
                    .from('booths')
                    .update({
                        addons: newAddons
                    })
                    .eq('id', boothId)

                if (updateError) throw updateError

                await supabase.from('subscription_history').insert({
                    organization_id: orgId,
                    plan_id: purchaseItem,
                    action: `purchased_addon_${booth.name.replace(/\s+/g, '')}`,
                    amount: paid_amount,
                    payment_method: payment_method || 'xendit',
                    payment_id: invoiceId || external_id,
                })
            }

            console.log(`✅ Payment successful for booth ${boothId}, item: ${purchaseItem}`)
            return NextResponse.json({ success: true, message: 'Purchase activated' })
        }

        // Handle failures/expiration
        if (status === 'EXPIRED' || status === 'FAILED') {
            await supabase.from('subscription_history').insert({
                organization_id: orgId,
                plan_id: purchaseItem,
                action: status === 'EXPIRED' ? 'payment_expired' : 'payment_failed',
                amount: paid_amount || 0,
                payment_id: invoiceId || external_id,
            })

            return NextResponse.json({ success: true, message: `Payment ${status.toLowerCase()} logged` })
        }

        return NextResponse.json({ message: 'Status not handled', status })
    } catch (error) {
        console.error('/api/subscriptions/webhook POST error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({ status: 'ok', message: 'Subscription webhook endpoint' })
}
