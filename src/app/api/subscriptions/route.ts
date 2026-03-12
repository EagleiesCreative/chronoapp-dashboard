import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase-server'
import { createInvoice, getInvoiceById } from '@/lib/xendit'
import { getOrgSubscription, getAllPlans } from '@/lib/features'

// GET - Fetch current subscription details + billing history
export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const requestedOrgId = searchParams.get('orgId') || orgId

        if (!requestedOrgId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
        }

        const subscription = await getOrgSubscription(requestedOrgId)
        const plans = await getAllPlans()

        // Fetch billing history
        const { data: history, error: historyError } = await supabase
            .from('subscription_history')
            .select('*')
            .eq('organization_id', requestedOrgId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (historyError) {
            console.error('Error fetching billing history:', historyError)
        }

        // Check if there's a pending invoice
        let pendingInvoice = null
        if (subscription) {
            const { data: org } = await supabase
                .from('organizations')
                .select('xendit_invoice_id')
                .eq('id', requestedOrgId)
                .single()

            if (org?.xendit_invoice_id) {
                try {
                    const invoice = await getInvoiceById(org.xendit_invoice_id)
                    if (invoice && invoice.status === 'PENDING') {
                        pendingInvoice = {
                            id: invoice.id,
                            invoice_url: invoice.invoice_url,
                            amount: invoice.amount,
                            status: invoice.status,
                            expiry_date: invoice.expiry_date,
                        }
                    } else if (invoice && (invoice.status === 'EXPIRED' || invoice.status === 'SETTLED' || invoice.status === 'PAID')) {
                        // Clear expired/completed invoice from org
                        await supabase
                            .from('organizations')
                            .update({ xendit_invoice_id: null })
                            .eq('id', requestedOrgId)
                    }
                } catch (err) {
                    console.error('Error checking pending invoice:', err)
                }
            }
        }

        return NextResponse.json({
            subscription,
            plans,
            history: history || [],
            pendingInvoice,
        })
    } catch (error) {
        console.error('/api/subscriptions GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Create/Upgrade subscription via Xendit invoice
export async function POST(req: NextRequest) {
    try {
        const { userId, orgId: authOrgId, orgRole } = await auth()
        if (!userId || !authOrgId) {
            return NextResponse.json({ error: 'Not authenticated or missing organization' }, { status: 401 })
        }

        if (orgRole !== 'org:admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await req.json()
        const { planId } = body
        const orgId = authOrgId

        if (!planId) {
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

        // For Basic plan, just downgrade directly
        if (planId === 'basic') {
            const { error } = await supabase
                .from('organizations')
                .update({
                    subscription_plan: 'basic',
                    subscription_status: 'active',
                    max_booths: 1,
                    subscription_expires_at: null,
                    xendit_invoice_id: null,
                })
                .eq('id', orgId)

            if (error) {
                console.error('Error downgrading to basic:', error)
                return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
            }

            await supabase.from('subscription_history').insert({
                organization_id: orgId,
                plan_id: 'basic',
                action: 'downgraded',
                amount: 0,
            })

            return NextResponse.json({ success: true, plan: 'basic' })
        }

        // --- Pro plan: Create Xendit invoice ---

        // Check for existing pending invoice (prevent duplicates)
        const { data: org } = await supabase
            .from('organizations')
            .select('xendit_invoice_id')
            .eq('id', orgId)
            .single()

        if (org?.xendit_invoice_id) {
            try {
                const existingInvoice = await getInvoiceById(org.xendit_invoice_id)
                if (existingInvoice && existingInvoice.status === 'PENDING') {
                    // Return existing pending invoice URL
                    return NextResponse.json({
                        success: true,
                        payment_required: true,
                        payment_url: existingInvoice.invoice_url,
                        amount: existingInvoice.amount,
                        invoice_id: existingInvoice.id,
                    })
                }
            } catch (err) {
                console.error('Error checking existing invoice:', err)
                // Continue to create new invoice
            }
        }

        // Get user email from Clerk
        const user = await currentUser()
        const payerEmail = user?.emailAddresses[0]?.emailAddress || 'customer@chronosnap.id'

        // Build the base URL for redirects
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
        const host = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'localhost:3000'
        const baseUrl = `${protocol}://${host}`

        const externalId = `sub_${orgId}_${Date.now()}`

        // Create Xendit invoice
        const invoice = await createInvoice({
            external_id: externalId,
            amount: Number(plan.price),
            payer_email: payerEmail,
            description: `${plan.name} Plan Subscription - ChronoSnap (Monthly)`,
        })

        // Store invoice ID on org
        await supabase
            .from('organizations')
            .update({ xendit_invoice_id: invoice.id })
            .eq('id', orgId)

        // Log pending upgrade in history
        await supabase.from('subscription_history').insert({
            organization_id: orgId,
            plan_id: planId,
            action: 'payment_initiated',
            amount: Number(plan.price),
            payment_id: invoice.id,
        })

        return NextResponse.json({
            success: true,
            payment_required: true,
            payment_url: invoice.invoice_url,
            amount: Number(plan.price),
            invoice_id: invoice.id,
        })
    } catch (error: any) {
        console.error('/api/subscriptions POST error:', error)
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, { status: 500 })
    }
}

// DELETE - Cancel subscription
export async function DELETE(req: NextRequest) {
    try {
        const { userId, orgId: authOrgId, orgRole } = await auth()
        if (!userId || !authOrgId) {
            return NextResponse.json({ error: 'Not authenticated or missing organization' }, { status: 401 })
        }

        if (orgRole !== 'org:admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const orgId = authOrgId

        // Mark subscription as cancelled
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

        await supabase.from('subscription_history').insert({
            organization_id: orgId,
            plan_id: 'basic',
            action: 'cancelled',
            amount: 0,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('/api/subscriptions DELETE error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
