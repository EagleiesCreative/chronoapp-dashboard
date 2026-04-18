import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { PLANS, ADDONS, PlanId, AddonId } from '@/lib/pricing'

// Webhook handler for Xendit payment callbacks (subscription payments)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // ── Security: Always require the webhook secret ──────────────────────
        // If XENDIT_WEBHOOK_SECRET is not set, refuse all requests.
        // Never allow an unverified token in any environment.
        const webhookToken = req.headers.get('x-callback-token')
        const EXPECTED_TOKEN = process.env.XENDIT_WEBHOOK_SECRET

        if (!EXPECTED_TOKEN) {
            console.error('XENDIT_WEBHOOK_SECRET is not configured — rejecting webhook')
            return NextResponse.json({ error: 'Webhook not configured on server' }, { status: 500 })
        }

        if (webhookToken !== EXPECTED_TOKEN) {
            console.error('Invalid Xendit webhook token — possible spoofing attempt')
            return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 })
        }
        // ─────────────────────────────────────────────────────────────────────

        const { external_id, status, paid_amount, payment_method, id: invoiceId, paid_at } = body

        console.log(`Subscription webhook: status=${status} external_id=${external_id} invoice=${invoiceId}`)

        // external_id format: sub_{boothId}_{purchaseItem}_{timestamp}
        if (!external_id?.startsWith('sub_')) {
            return NextResponse.json({ message: 'Not a subscription payment — ignored' }, { status: 200 })
        }

        const parts = external_id.split('_')
        if (parts.length < 4) {
            console.error('Malformed external_id:', external_id)
            return NextResponse.json({ error: 'Invalid external_id format' }, { status: 400 })
        }

        const boothId = parts[1]
        const purchaseItem = parts[2] // planId or addonId

        // Fetch booth — scoped only by id (org_id is derived from the booth row itself)
        const { data: booth } = await supabase
            .from('booths')
            .select('id, organization_id, name, addons')
            .eq('id', boothId)
            .single()

        if (!booth) {
            console.error(`Webhook: Booth ${boothId} not found`)
            return NextResponse.json({ error: 'Booth not found' }, { status: 404 })
        }

        const orgId = booth.organization_id

        if (status === 'PAID' || status === 'SETTLED') {
            const isPlan = Object.keys(PLANS).includes(purchaseItem)
            const isAddon = Object.keys(ADDONS).includes(purchaseItem)

            // ── Idempotency: skip if this invoice was already processed ──────
            if (invoiceId) {
                const { data: alreadyProcessed } = await supabase
                    .from('subscription_history')
                    .select('id')
                    .eq('payment_id', invoiceId)
                    .not('action', 'eq', 'payment_initiated')  // initiated != processed
                    .maybeSingle()

                if (alreadyProcessed) {
                    console.log(`Webhook: Invoice ${invoiceId} already processed — skipping (idempotent)`)
                    return NextResponse.json({ message: 'Already processed' }, { status: 200 })
                }
            }
            // ─────────────────────────────────────────────────────────────────

            if (isPlan) {
                const planDef = PLANS[purchaseItem as PlanId]

                // ── Amount validation: paid must be ≥ expected plan price ──
                if (planDef.price > 0 && paid_amount < planDef.price) {
                    console.error(`Webhook: Amount mismatch for plan ${purchaseItem}. Expected ≥${planDef.price}, got ${paid_amount}. Rejecting.`)
                    return NextResponse.json({ error: 'Paid amount is less than plan price' }, { status: 400 })
                }
                // ─────────────────────────────────────────────────────────────

                // ── Use Xendit's paid_at as base for expiry, not server time ──
                // This prevents drift from Xendit webhook retries
                const baseDate = paid_at ? new Date(paid_at) : new Date()
                const expiresAt = new Date(baseDate)
                expiresAt.setDate(expiresAt.getDate() + 30)
                // ─────────────────────────────────────────────────────────────

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

                console.log(`✅ Plan activated: booth=${boothId} plan=${purchaseItem} expires=${expiresAt.toISOString()}`)

            } else if (isAddon) {
                const currentAddons = booth.addons || []
                const newAddons = [...new Set([...currentAddons, purchaseItem])]

                const { error: updateError } = await supabase
                    .from('booths')
                    .update({ addons: newAddons })
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

                console.log(`✅ Addon activated: booth=${boothId} addon=${purchaseItem}`)
            } else {
                console.warn(`Webhook: Unknown purchase item "${purchaseItem}" — not a plan or addon`)
            }

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

            console.log(`Payment ${status} logged for booth ${boothId}`)
            return NextResponse.json({ success: true, message: `Payment ${status.toLowerCase()} logged` })
        }

        return NextResponse.json({ message: 'Status not handled', status })

    } catch (error) {
        console.error('/api/subscriptions/webhook POST error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({ status: 'ok', message: 'Subscription webhook endpoint active' })
}
