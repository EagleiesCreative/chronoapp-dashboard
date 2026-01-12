import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase-server'
import { getOrgSubscription, getAllPlans } from '@/lib/features'

// GET - Fetch current subscription details
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const orgId = searchParams.get('orgId')

        if (!orgId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
        }

        const subscription = await getOrgSubscription(orgId)
        const plans = await getAllPlans()

        return NextResponse.json({ subscription, plans })
    } catch (error) {
        console.error('Error fetching subscription:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Create/Upgrade subscription
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json()
        const { orgId, planId } = body

        if (!orgId || !planId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get plan details
        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single()

        if (planError || !plan) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // For Basic plan, just update directly
        if (planId === 'basic') {
            const { error } = await supabase
                .from('organizations')
                .update({
                    subscription_plan: 'basic',
                    subscription_status: 'active',
                    max_booths: 1,
                    subscription_expires_at: null,
                })
                .eq('id', orgId)

            if (error) {
                console.error('Error downgrading to basic:', error)
                return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
            }

            // Log history
            await supabase.from('subscription_history').insert({
                organization_id: orgId,
                plan_id: 'basic',
                action: 'downgraded',
                amount: 0,
            })

            return NextResponse.json({ success: true, plan: 'basic' })
        }

        // For Pro plan, create Xendit invoice
        // TODO: Integrate with Xendit for payment
        // For now, return payment URL placeholder
        const paymentUrl = `/api/subscriptions/payment?orgId=${orgId}&planId=${planId}`

        return NextResponse.json({
            success: true,
            payment_required: true,
            payment_url: paymentUrl,
            amount: plan.price
        })
    } catch (error) {
        console.error('Error creating subscription:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - Cancel subscription
export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const orgId = searchParams.get('orgId')

        if (!orgId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
        }

        // Mark subscription as cancelled (will downgrade at end of period)
        const { error } = await supabase
            .from('organizations')
            .update({
                subscription_status: 'cancelled',
            })
            .eq('id', orgId)

        if (error) {
            console.error('Error cancelling subscription:', error)
            return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
        }

        // Log history
        await supabase.from('subscription_history').insert({
            organization_id: orgId,
            plan_id: 'basic',
            action: 'cancelled',
            amount: 0,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error cancelling subscription:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
