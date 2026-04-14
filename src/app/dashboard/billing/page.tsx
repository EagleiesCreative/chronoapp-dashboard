"use client"

import { Suspense, useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    IconSparkles,
    IconCheck,
    IconCreditCard,
    IconAlertTriangle,
    IconClock,
    IconExternalLink,
    IconReceipt,
    IconLoader,
    IconX,
    IconArrowUp,
    IconArrowDown,
    IconDeviceDesktop,
    IconPlus,
} from "@tabler/icons-react"
import Link from "next/link"

interface Booth {
    id: string
    name: string
    subscription_plan: string
    subscription_status: string
    subscription_expires_at: string | null
    addons: string[]
}

interface Plan {
    id: string
    name: string
    price: number
    features: Record<string, boolean>
}

interface Addon {
    id: string
    name: string
    description: string
    price: number
    interval: string
}

interface SubscriptionHistory {
    id: string
    plan_id: string
    action: string
    amount: number
    payment_method: string | null
    payment_id: string | null
    created_at: string
}

interface PendingInvoice {
    id: string
    invoice_url: string
    amount: number
    status: string
    expiry_date: string
}

function BillingContent() {
    const { organization } = useOrganization()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [booths, setBooths] = useState<Booth[]>([])
    const [plans, setPlans] = useState<Plan[]>([])
    const [addons, setAddons] = useState<Addon[]>([])
    const [history, setHistory] = useState<SubscriptionHistory[]>([])
    const [pendingInvoice, setPendingInvoice] = useState<PendingInvoice | null>(null)
    const [processingItem, setProcessingItem] = useState<string | null>(null) // '{boothId}-{plan/addon}'

    useEffect(() => {
        const paymentStatus = searchParams.get('payment')
        if (paymentStatus === 'success') {
            toast.success('Payment successful! Your purchase is being activated.')
        } else if (paymentStatus === 'failed') {
            toast.error('Payment failed or was cancelled. Please try again.')
        }
    }, [searchParams])

    useEffect(() => {
        if (!organization) return

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/subscriptions?orgId=${organization.id}`)
                const data = await res.json()
                setBooths(data.booths || [])
                setPlans(data.plans || [])
                setAddons(data.addons || [])
                setHistory(data.history || [])
                setPendingInvoice(data.pendingInvoice || null)
            } catch (error) {
                console.error('Error fetching billing details:', error)
                toast.error('Failed to load billing details')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [organization])

    const handlePurchase = async (boothId: string, itemType: 'plan' | 'addon', itemId: string) => {
        if (!organization) return
        
        if (itemType === 'plan' && itemId === 'growth') {
             if (!confirm('Are you sure you want to downgrade this booth to the Growth plan? Features will immediately become limited.')) return;
        }

        const processingKey = `${boothId}-${itemId}`
        setProcessingItem(processingKey)

        try {
            const body: any = { orgId: organization.id, boothId }
            if (itemType === 'plan') body.planId = itemId
            if (itemType === 'addon') body.addonId = itemId

            const res = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Failed to process purchase')
                return
            }

            if (data.payment_required && data.payment_url) {
                toast.info('Redirecting to payment...')
                window.location.href = data.payment_url
            } else if (data.success) {
                toast.success('Booth subscription updated!')
                window.location.reload()
            }
        } catch (error) {
            console.error('Error with purchase:', error)
            toast.error('Failed to initiate purchase')
        } finally {
            setProcessingItem(null)
        }
    }

    const handleCancel = async (boothId: string) => {
        if (!organization) return
        if (!confirm('Are you sure you want to cancel the paid subscription for this booth? It will revert to the Growth plan at the end of the billing period.')) {
            return
        }

        try {
            const res = await fetch(`/api/subscriptions?boothId=${boothId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Subscription cancelled. You will retain premium features until the expiration date.')
                window.location.reload()
            }
        } catch (error) {
            console.error('Error cancelling:', error)
            toast.error('Failed to cancel subscription')
        }
    }

    const getActionDisplay = (action: string) => {
        if (action.includes('purchased_addon')) {
             return { label: 'Add-on Purchased', icon: <IconPlus className="h-4 w-4 text-primary" />, color: 'text-primary' }
        }
        if (action.includes('upgraded')) {
            return { label: 'Plan Upgraded', icon: <IconArrowUp className="h-4 w-4 text-green-500" />, color: 'text-green-600' }
        }
        if (action.includes('downgraded')) {
             return { label: 'Plan Downgraded', icon: <IconArrowDown className="h-4 w-4 text-orange-500" />, color: 'text-orange-600' }
        }
        switch (action) {
            case 'payment_initiated':
                return { label: 'Payment Initiated', icon: <IconClock className="h-4 w-4 text-blue-500" />, color: 'text-blue-600' }
            case 'payment_failed':
                return { label: 'Payment Failed', icon: <IconAlertTriangle className="h-4 w-4 text-red-500" />, color: 'text-red-600' }
            case 'payment_expired':
                return { label: 'Payment Expired', icon: <IconClock className="h-4 w-4 text-amber-500" />, color: 'text-amber-600' }
            default:
                if (action.includes('cancelled')) {
                     return { label: 'Subscription Cancelled', icon: <IconX className="h-4 w-4 text-red-500" />, color: 'text-red-600' }
                }
                return { label: action, icon: <IconReceipt className="h-4 w-4 text-muted-foreground" />, color: 'text-muted-foreground' }
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-muted rounded w-48" />
                    <div className="h-64 bg-muted rounded" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Billing & Subscriptions</h1>
                <p className="text-sm text-muted-foreground">
                    Manage plans and add-ons individually for your active booths.
                </p>
            </div>

            {/* Pending Payment Banner */}
            {pendingInvoice && (
                <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                                <IconClock className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-medium text-amber-800 dark:text-amber-200">
                                    Payment Pending
                                </p>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    Complete your payment of Rp {pendingInvoice.amount.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => window.location.href = pendingInvoice.invoice_url}
                            className="shrink-0"
                        >
                            <IconExternalLink className="mr-2 h-4 w-4" />
                            Complete Payment
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Booth Mapping */}
            {booths.length === 0 ? (
                 <Card>
                     <CardContent className="py-10 text-center">
                         <IconDeviceDesktop className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                         <h3 className="text-lg font-medium">No Booths Found</h3>
                         <p className="text-muted-foreground mb-4">Create a booth to start managing its subscription.</p>
                         <Button asChild>
                             <Link href="/dashboard/booths">Go to Booths</Link>
                         </Button>
                     </CardContent>
                 </Card>
            ) : (
                <div className="space-y-6">
                    {booths.map(booth => {
                        const currentPlan = plans.find(p => p.id === (booth.subscription_plan || 'growth')) || plans[0]
                        const isPro = currentPlan.id !== 'growth'
                        const isCancelled = booth.subscription_status === 'cancelled'
                        const boothAddons = addons.filter(a => booth.addons?.includes(a.id))
                        const availableAddons = addons.filter(a => !booth.addons?.includes(a.id))

                        return (
                             <Card key={booth.id} className={isPro ? "border-primary/50 overflow-hidden" : "overflow-hidden"}>
                                {isPro && (
                                     <div className="bg-primary h-1 w-full" />
                                )}
                                <CardHeader className="pb-2">
                                     <div className="flex items-start justify-between">
                                         <div>
                                             <CardTitle className="flex items-center gap-2 text-xl">
                                                 {booth.name}
                                                 {isPro && <IconSparkles className="h-5 w-5 text-primary" />}
                                             </CardTitle>
                                             <CardDescription className="mt-1">
                                                 {currentPlan.name} Plan
                                             </CardDescription>
                                         </div>
                                         <Badge variant={isCancelled ? "destructive" : isPro ? "default" : "secondary"} className="uppercase tracking-wider text-[10px] font-semibold">
                                             {isCancelled ? "Cancelled" : (isPro ? "Premium" : "Free")}
                                         </Badge>
                                     </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                     <div className="flex flex-col md:flex-row gap-8">
                                         {/* Main Info */}
                                         <div className="flex-1 space-y-4">
                                             <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Plan Details</h4>
                                             <div className="flex flex-wrap gap-x-12 gap-y-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Price</p>
                                                    <p className="text-sm font-medium">
                                                        {currentPlan.price === 0 ? 'Free' : `Rp ${currentPlan.price.toLocaleString('id-ID')}/mo`}
                                                    </p>
                                                </div>
                                                {booth.subscription_expires_at && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-muted-foreground">
                                                            {isCancelled ? 'Access Until' : 'Next Billing'}
                                                        </p>
                                                        <p className="text-sm font-medium">
                                                            {new Date(booth.subscription_expires_at).toLocaleDateString('id-ID')}
                                                        </p>
                                                    </div>
                                                )}
                                             </div>

                                             {boothAddons.length > 0 && (
                                                  <div className="pt-2">
                                                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Active Add-ons</p>
                                                      <div className="flex flex-wrap gap-2">
                                                           {boothAddons.map(a => (
                                                                <Badge key={a.id} variant="secondary" className="font-normal border">
                                                                    <IconCheck className="w-3 h-3 mr-1 text-primary" /> {a.name}
                                                                </Badge>
                                                           ))}
                                                      </div>
                                                  </div>
                                             )}
                                         </div>
                                         
                                         {/* Allowed Features Snippet */}
                                         <div className="flex-1 space-y-4 md:border-l md:pl-8 border-border">
                                              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Included Features</h4>
                                              <ul className="grid grid-cols-1 gap-2 text-sm">
                                                  {Object.entries(currentPlan.features).map(([key, val]) => val && (
                                                      <li key={key} className="flex items-center gap-2 text-muted-foreground">
                                                          <IconCheck className="w-4 h-4 text-primary" />
                                                          <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                                      </li>
                                                  ))}
                                              </ul>
                                         </div>
                                     </div>
                                </CardContent>
                                <CardFooter className="pt-2 pb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                     <div className="flex flex-wrap gap-2">
                                         {/* Plan upgrades */}
                                         {plans.map(p => {
                                             if (p.id === currentPlan.id) return null;
                                             // Only show upgrade to pro or panoramic
                                             if (currentPlan.id === 'growth' && p.id !== 'growth') {
                                                 return (
                                                     <Button 
                                                        key={p.id} 
                                                        variant={p.id === 'professional' ? 'default' : 'outline'} 
                                                        size="sm"
                                                        onClick={() => handlePurchase(booth.id, 'plan', p.id)}
                                                        disabled={!!processingItem || !!pendingInvoice}
                                                     >
                                                         {processingItem === `${booth.id}-${p.id}` ? <IconLoader className="h-4 w-4 mr-2 animate-spin" /> : <IconArrowUp className="h-4 w-4 mr-1"/>}
                                                         Upgrade to {p.name}
                                                     </Button>
                                                 )
                                             }
                                             // If Pro, show downgrade to Growth or upgrade to panoramic
                                             if (currentPlan.id === 'professional') {
                                                 if (p.id === 'panoramic-plus') {
                                                     return (
                                                         <Button 
                                                            key={p.id} 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handlePurchase(booth.id, 'plan', p.id)}
                                                            disabled={!!processingItem || !!pendingInvoice}
                                                         >
                                                             {processingItem === `${booth.id}-${p.id}` ? <IconLoader className="h-4 w-4 mr-2 animate-spin" /> : <IconArrowUp className="h-4 w-4 mr-1"/>}
                                                             Upgrade
                                                         </Button>
                                                     )
                                                 }
                                             }
                                             // Provide general cancel button instead of manual downgrade
                                             return null;
                                         })}

                                         {isPro && !isCancelled && (
                                             <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" size="sm" onClick={() => handleCancel(booth.id)}>
                                                 Cancel Plan
                                             </Button>
                                         )}
                                     </div>
                                     
                                     {/* Addons Box */}
                                     {availableAddons.length > 0 && isPro && (
                                          <div className="flex flex-wrap gap-2 items-center">
                                              <span className="text-xs text-muted-foreground mr-1 uppercase tracking-wider font-semibold">Available Add-ons:</span>
                                              {availableAddons.map(a => (
                                                  <Button 
                                                      key={a.id} 
                                                      variant="secondary" 
                                                      size="sm"
                                                      onClick={() => handlePurchase(booth.id, 'addon', a.id)}
                                                      disabled={!!processingItem || !!pendingInvoice}
                                                      title={`Rp ${a.price.toLocaleString('id-ID')} (One-time)`}
                                                  >
                                                      {processingItem === `${booth.id}-${a.id}` ? <IconLoader className="h-4 w-4 mr-1 animate-spin" /> : <IconPlus className="h-3 w-3 mr-1" />}
                                                      {a.name}
                                                  </Button>
                                              ))}
                                          </div>
                                     )}
                                     {!isPro && availableAddons.length > 0 && (
                                          <p className="text-xs text-muted-foreground">Upgrade to purchase add-ons.</p>
                                     )}
                                </CardFooter>
                             </Card>
                        )
                    })}
                </div>
            )}

            {/* Payment Method */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconCreditCard className="h-5 w-5" />
                        Base Payment Methods
                    </CardTitle>
                    <CardDescription>
                        Supported infrastructure
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Payments are processed securely via Xendit. We support bank transfer (BCA, BNI, BRI, Mandiri), e-wallet (OVO, DANA, GoPay), QRIS, and credit cards.
                    </p>
                </CardContent>
            </Card>

            {/* Billing History */}
            {history.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconReceipt className="h-5 w-5" />
                            Billing History
                        </CardTitle>
                        <CardDescription>
                            Your recent subscription activity across all booths
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-border">
                            {history.map((entry) => {
                                const display = getActionDisplay(entry.action)
                                return (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted/50 rounded-full border border-border">
                                                {display.icon}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${display.color}`}>
                                                    {display.label}
                                                    {entry.action.includes('_') && !['payment_initiated', 'payment_failed', 'payment_expired'].includes(entry.action) && (
                                                         <span className="text-muted-foreground font-normal ml-2">
                                                             ({entry.action.split('_').pop()})
                                                         </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(entry.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        {entry.amount > 0 && (
                                            <span className="text-sm font-mono font-medium flex flex-col items-end">
                                                Rp {Number(entry.amount).toLocaleString('id-ID')}
                                                {entry.plan_id && <span className="text-[10px] text-muted-foreground uppercase mt-0.5">{entry.plan_id}</span>}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    )
}

export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-muted rounded w-48" />
                    <div className="h-64 bg-muted rounded" />
                </div>
            </div>
        }>
            <BillingContent />
        </Suspense>
    )
}
