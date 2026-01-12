import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

// Webhook handler for Xendit payment callbacks
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Verify webhook signature (in production, verify with Xendit webhook secret)
        const webhookToken = req.headers.get('x-callback-token')
        // TODO: Verify webhookToken against XENDIT_WEBHOOK_SECRET

        console.log('Subscription webhook received:', body)

        const { external_id, status, paid_amount, payment_method } = body

        // external_id format: sub_{orgId}_{timestamp}
        if (!external_id?.startsWith('sub_')) {
            return NextResponse.json({ message: 'Not a subscription payment' }, { status: 200 })
        }

        const parts = external_id.split('_')
        if (parts.length < 2) {
            return NextResponse.json({ error: 'Invalid external_id format' }, { status: 400 })
        }

        const orgId = parts[1]

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
                payment_id: body.id || external_id,
            })

            console.log(`Subscription activated for org ${orgId}`)

            return NextResponse.json({ success: true, message: 'Subscription activated' })
        }

        if (status === 'EXPIRED' || status === 'FAILED') {
            // Payment failed - log but don't change subscription
            await supabase.from('subscription_history').insert({
                organization_id: orgId,
                plan_id: 'pro',
                action: 'payment_failed',
                amount: paid_amount || 0,
                payment_id: body.id || external_id,
            })

            console.log(`Payment failed for org ${orgId}`)

            return NextResponse.json({ success: true, message: 'Payment failure logged' })
        }

        return NextResponse.json({ message: 'Status not handled', status })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}

// Allow GET for webhook verification (some payment providers ping this endpoint)
export async function GET() {
    return NextResponse.json({ status: 'ok', message: 'Subscription webhook endpoint' })
}
