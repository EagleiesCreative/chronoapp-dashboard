"use client"

import { useOrganization } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { IconSparkles, IconCheck, IconCreditCard, IconReceipt, IconAlertTriangle } from "@tabler/icons-react"
import Link from "next/link"

interface Subscription {
    subscription_plan: string
    subscription_status: string
    subscription_expires_at: string | null
    max_booths: number
}

interface Plan {
    id: string
    name: string
    price: number
    max_booths: number
    features: Record<string, boolean>
}

interface SubscriptionHistory {
    id: string
    plan_id: string
    action: string
    amount: number
    created_at: string
}

export default function BillingPage() {
    const { organization } = useOrganization()
    const [loading, setLoading] = useState(true)
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [plans, setPlans] = useState<Plan[]>([])
    const [history, setHistory] = useState<SubscriptionHistory[]>([])
    const [upgrading, setUpgrading] = useState(false)

    useEffect(() => {
        if (!organization) return

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/subscriptions?orgId=${organization.id}`)
                const data = await res.json()
                setSubscription(data.subscription)
                setPlans(data.plans || [])
            } catch (error) {
                console.error('Error fetching subscription:', error)
                toast.error('Failed to load subscription details')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [organization])

    const handleUpgrade = async (planId: string) => {
        if (!organization) return

        setUpgrading(true)
        try {
            const res = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId: organization.id, planId })
            })

            const data = await res.json()

            if (data.payment_required) {
                // Redirect to payment
                toast.info('Redirecting to payment...')
                // TODO: Redirect to Xendit payment page
                window.location.href = data.payment_url
            } else if (data.success) {
                toast.success('Subscription updated!')
                window.location.reload()
            }
        } catch (error) {
            console.error('Error upgrading:', error)
            toast.error('Failed to upgrade subscription')
        } finally {
            setUpgrading(false)
        }
    }

    const handleCancel = async () => {
        if (!organization) return
        if (!confirm('Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your billing period.')) {
            return
        }

        try {
            const res = await fetch(`/api/subscriptions?orgId=${organization.id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Subscription cancelled. You will retain Pro features until the end of your billing period.')
                window.location.reload()
            }
        } catch (error) {
            console.error('Error cancelling:', error)
            toast.error('Failed to cancel subscription')
        }
    }

    const currentPlan = plans.find(p => p.id === subscription?.subscription_plan) || plans[0]
    const isPro = subscription?.subscription_plan === 'pro'
    const isCancelled = subscription?.subscription_status === 'cancelled'

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
                <h1 className="text-2xl font-semibold tracking-tight">Billing & Subscription</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your subscription and billing information
                </p>
            </div>

            {/* Current Plan */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Current Plan
                                {isPro && <IconSparkles className="h-5 w-5 text-primary" />}
                            </CardTitle>
                            <CardDescription>
                                {isPro ? 'You have access to all premium features' : 'Upgrade to unlock more features'}
                            </CardDescription>
                        </div>
                        <Badge variant={isPro ? 'default' : 'secondary'} className="text-lg px-4 py-1">
                            {currentPlan?.name || 'Basic'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="font-medium flex items-center gap-1">
                                {isCancelled ? (
                                    <>
                                        <IconAlertTriangle className="h-4 w-4 text-yellow-500" />
                                        Cancelled
                                    </>
                                ) : (
                                    <>
                                        <IconCheck className="h-4 w-4 text-green-500" />
                                        Active
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Booth Limit</p>
                            <p className="font-medium">{subscription?.max_booths || 1} booth(s)</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Price</p>
                            <p className="font-medium">
                                {currentPlan?.price === 0 ? 'Free' : `Rp ${currentPlan?.price.toLocaleString('id-ID')}/mo`}
                            </p>
                        </div>
                        {subscription?.subscription_expires_at && (
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    {isCancelled ? 'Access Until' : 'Next Billing'}
                                </p>
                                <p className="font-medium">
                                    {new Date(subscription.subscription_expires_at).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        )}
                    </div>

                    {isCancelled && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Your subscription has been cancelled. You'll retain Pro features until the end of your billing period.
                                You can reactivate anytime.
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex gap-2">
                    {!isPro ? (
                        <Button onClick={() => handleUpgrade('pro')} disabled={upgrading}>
                            <IconSparkles className="h-4 w-4 mr-2" />
                            {upgrading ? 'Processing...' : 'Upgrade to Pro'}
                        </Button>
                    ) : !isCancelled ? (
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel Subscription
                        </Button>
                    ) : (
                        <Button onClick={() => handleUpgrade('pro')} disabled={upgrading}>
                            {upgrading ? 'Processing...' : 'Reactivate Pro'}
                        </Button>
                    )}
                    <Button variant="outline" asChild>
                        <Link href="/pricing">View All Plans</Link>
                    </Button>
                </CardFooter>
            </Card>

            {/* Plan Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>Plan Comparison</CardTitle>
                    <CardDescription>See what's included in each plan</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`p-4 rounded-lg border ${plan.id === subscription?.subscription_plan
                                        ? 'border-primary bg-primary/5'
                                        : 'border-muted'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                                    <span className="font-bold">
                                        {plan.price === 0 ? 'Free' : `Rp ${plan.price.toLocaleString('id-ID')}/mo`}
                                    </span>
                                </div>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm">
                                        <IconCheck className="h-4 w-4 text-primary" />
                                        {plan.max_booths} booth(s)
                                    </li>
                                    {Object.entries(plan.features).map(([feature, enabled]) => (
                                        <li key={feature} className="flex items-center gap-2 text-sm">
                                            {enabled ? (
                                                <IconCheck className="h-4 w-4 text-primary" />
                                            ) : (
                                                <span className="h-4 w-4 text-muted-foreground">×</span>
                                            )}
                                            <span className={enabled ? '' : 'text-muted-foreground'}>
                                                {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {plan.id !== subscription?.subscription_plan && (
                                    <Button
                                        className="w-full mt-4"
                                        variant={plan.id === 'pro' ? 'default' : 'outline'}
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={upgrading}
                                    >
                                        {plan.id === 'pro' ? 'Upgrade' : 'Downgrade'}
                                    </Button>
                                )}
                                {plan.id === subscription?.subscription_plan && (
                                    <div className="mt-4 text-center text-sm text-muted-foreground">
                                        Current Plan
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconCreditCard className="h-5 w-5" />
                        Payment Method
                    </CardTitle>
                    <CardDescription>
                        Manage your payment information
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Payments are processed securely via Xendit. You can pay using bank transfer, e-wallet, or credit card.
                    </p>
                </CardContent>
            </Card>

            {/* Need Help */}
            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                    <CardDescription>
                        Contact our support team for billing inquiries
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/help">Contact Support</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
