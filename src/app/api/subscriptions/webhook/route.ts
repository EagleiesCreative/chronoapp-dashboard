import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

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

        // external_id format: sub_{orgId}_{timestamp}
        // orgId may itself contain underscores, so we parse carefully:
        // "sub_" prefix (4 chars) + everything up to the last "_" is the orgId
        if (!external_id?.startsWith('sub_')) {
            return NextResponse.json({ message: 'Not a subscription payment' }, { status: 200 })
        }

        const withoutPrefix = external_id.slice(4) // remove "sub_"
        const lastUnderscoreIdx = withoutPrefix.lastIndexOf('_')
        if (lastUnderscoreIdx === -1) {
            return NextResponse.json({ error: 'Invalid external_id format' }, { status: 400 })
        }

        const orgId = withoutPrefix.slice(0, lastUnderscoreIdx)

        if (status === 'PAID' || status === 'SETTLED') {
            // Calculate expiration (30 days from now)
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 30)

            // Update organization subscription
            const { error: updateError } = await supabase
                .from('organizations')
                .update({
                    subscription_plan: 'pro',
                    subscription_status: 'active',
                    subscription_expires_at: expiresAt.toISOString(),
                    max_booths: 5,
                    xendit_invoice_id: null, // Clear pending invoice
                })
                .eq('id', orgId)

            if (updateError) {
                console.error('Error updating subscription:', updateError)
                return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
            }

            // Log subscription history
            await supabase.from('subscription_history').insert({
                organization_id: orgId,
                plan_id: 'pro',
                action: 'upgraded',
                amount: paid_amount,
                payment_method: payment_method || 'xendit',
                payment_id: invoiceId || external_id,
            })

            console.log(`✅ Subscription activated for org ${orgId}, expires ${expiresAt.toISOString()}`)

            return NextResponse.json({ success: true, message: 'Subscription activated' })
        }

        if (status === 'EXPIRED') {
            // Invoice expired — clear xendit_invoice_id so user can try again
            await supabase
                .from('organizations')
                .update({ xendit_invoice_id: null })
                .eq('id', orgId)

            await supabase.from('subscription_history').insert({
                organization_id: orgId,
                plan_id: 'pro',
                action: 'payment_expired',
                amount: paid_amount || 0,
                payment_id: invoiceId || external_id,
            })

            console.log(`⚠️ Payment expired for org ${orgId}`)

            return NextResponse.json({ success: true, message: 'Payment expiry logged' })
        }

        if (status === 'FAILED') {
            await supabase
                .from('organizations')
                .update({ xendit_invoice_id: null })
                .eq('id', orgId)

            await supabase.from('subscription_history').insert({
                organization_id: orgId,
                plan_id: 'pro',
                action: 'payment_failed',
                amount: paid_amount || 0,
                payment_id: invoiceId || external_id,
            })

            console.log(`❌ Payment failed for org ${orgId}`)

            return NextResponse.json({ success: true, message: 'Payment failure logged' })
        }

        return NextResponse.json({ message: 'Status not handled', status })
    } catch (error) {
        console.error('/api/subscriptions/webhook POST error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}

// Allow GET for webhook verification
export async function GET() {
    return NextResponse.json({ status: 'ok', message: 'Subscription webhook endpoint' })
}
