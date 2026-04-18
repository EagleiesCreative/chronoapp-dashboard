import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase-server'
import { createInvoice, getInvoiceById } from '@/lib/xendit'
import { getBoothSubscription } from '@/lib/features'
import { PLANS, ADDONS, PlanId, AddonId } from '@/lib/pricing'

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Always use Clerk's authenticated orgId — never trust client-provided orgId.
        // Accepting orgId from query string would allow any user to read any org's data.
        const requestedOrgId = orgId

        if (!requestedOrgId) {
            return NextResponse.json({ error: 'No organization selected. Please switch to an organization.' }, { status: 400 })
        }

        // Fetch booths for this org to show their subscriptions
        const { data: booths, error: boothsError } = await supabase
            .from('booths')
            .select('id, name, subscription_plan, subscription_status, subscription_expires_at, addons')
            .eq('organization_id', requestedOrgId)
            .order('created_at', { ascending: false })

        if (boothsError) {
            console.error('Error fetching booths:', boothsError)
        }

        // Fetch billing history for org
        const { data: history, error: historyError } = await supabase
            .from('subscription_history')
            .select('*')
            .eq('organization_id', requestedOrgId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (historyError) {
            console.error('Error fetching billing history:', historyError)
        }

        // Convert the Plans and Addons object into an array for the frontend
        const plansList = Object.values(PLANS)
        const addonsList = Object.values(ADDONS)

        // Find if there are pending invoices (we now store invoice_id temporarily on the organization, or history)
        // Let's check history for pending payments that aren't settled
        const pendingHistory = history?.find(h => h.action === 'payment_initiated')
        let pendingInvoice = null
        if (pendingHistory && pendingHistory.payment_id) {
            try {
                const invoice = await getInvoiceById(pendingHistory.payment_id)
                if (invoice && invoice.status === 'PENDING') {
                    pendingInvoice = {
                        id: invoice.id,
                        invoice_url: invoice.invoice_url,
                        amount: invoice.amount,
                        status: invoice.status,
                        expiry_date: invoice.expiry_date,
                    }
                } else if (invoice && (invoice.status === 'EXPIRED' || invoice.status === 'SETTLED' || invoice.status === 'PAID')) {
                     // update history action
                     await supabase.from('subscription_history')
                     .update({ action: invoice.status === 'EXPIRED' ? 'payment_expired' : 'upgraded' })
                     .eq('id', pendingHistory.id)
                }
            } catch (err) {
                 console.error('Error checking pending invoice:', err)
            }
        }

        return NextResponse.json({
            booths: booths || [],
            plans: plansList,
            addons: addonsList,
            history: history || [],
            pendingInvoice,
        })
    } catch (error) {
        console.error('/api/subscriptions GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

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
        const { planId, addonId, boothId } = body
        const orgId = authOrgId

        if (!boothId || (!planId && !addonId)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify the booth belongs to this org
        const boothSub = await getBoothSubscription(boothId, orgId)
        if (!boothSub) {
             return NextResponse.json({ error: 'Booth not found' }, { status: 404 })
        }

        let amount = 0
        let description = ''
        let purchaseItem = ''

        if (planId) {
            const plan = PLANS[planId as PlanId]
            if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
            amount = plan.price
            description = `${plan.name} Plan for ${boothSub.name}`
            purchaseItem = planId
            
            // Downgrade to Growth (Free) directly
            if (planId === 'growth') {
                await supabase
                    .from('booths')
                    .update({
                        subscription_plan: 'growth',
                        subscription_status: 'active',
                        subscription_expires_at: null,
                    })
                    .eq('id', boothId)
                
                await supabase.from('subscription_history').insert({
                    organization_id: orgId,
                    plan_id: 'growth',
                    action: `downgraded_${boothSub.name.replace(/\s+/g, '')}`,
                    amount: 0,
                })

                return NextResponse.json({ success: true })
            }

        } else if (addonId) {
            const addon = ADDONS[addonId as AddonId]
            if (!addon) return NextResponse.json({ error: 'Invalid addon' }, { status: 400 })
            
            if (boothSub.addons?.includes(addonId)) {
                 return NextResponse.json({ error: 'Addon already purchased for this booth' }, { status: 400 })
            }

            amount = addon.price
            description = `${addon.name} Add-on for ${boothSub.name}`
            purchaseItem = addonId
        }

        // --- Create Invoice for Paid Upgrade ---

        const user = await currentUser()
        const payerEmail = user?.emailAddresses[0]?.emailAddress || 'customer@chronosnap.id'
        const externalId = `sub_${boothId}_${purchaseItem}_${Date.now()}`

        const invoice = await createInvoice({
            external_id: externalId,
            amount: Number(amount),
            payer_email: payerEmail,
            description,
        })

        await supabase.from('subscription_history').insert({
            organization_id: orgId,
            plan_id: purchaseItem,
            action: 'payment_initiated', // The webhook will parse the metadata or externalId
            amount: Number(amount),
            payment_id: invoice.id,
        })

        return NextResponse.json({
            success: true,
            payment_required: true,
            payment_url: invoice.invoice_url,
            amount: Number(amount),
            invoice_id: invoice.id,
        })

    } catch (error: any) {
        console.error('/api/subscriptions POST error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { userId, orgId: authOrgId, orgRole } = await auth()
        if (!userId || !authOrgId) {
            return NextResponse.json({ error: 'Not authenticated or missing organization' }, { status: 401 })
        }

        if (orgRole !== 'org:admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const boothId = searchParams.get('boothId')
        
        if (!boothId) return NextResponse.json({ error: 'Booth ID required' }, { status: 400 })

        const orgId = authOrgId

        // Verify ownership
        const booth = await getBoothSubscription(boothId, orgId)
        if (!booth) return NextResponse.json({ error: 'Booth not found' }, { status: 404 })

        // Mark subscription as cancelled but keep old expiry
        const { error } = await supabase
            .from('booths')
            .update({
                subscription_status: 'cancelled',
            })
            .eq('id', boothId)
            .eq('organization_id', orgId)

        if (error) throw error

        await supabase.from('subscription_history').insert({
            organization_id: orgId,
            plan_id: booth.subscription_plan,
            action: `cancelled_${booth.name.replace(/\s+/g, '')}`,
            amount: 0,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('/api/subscriptions DELETE error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
