"use client"

import { useOrganization } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconSparkles, IconCheck } from "@tabler/icons-react"
import Link from "next/link"

interface FeatureGateProps {
    feature: string
    children: React.ReactNode
    fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
    const { organization } = useOrganization()
    const [hasAccess, setHasAccess] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!organization) return

        const checkFeature = async () => {
            try {
                const res = await fetch(`/api/features/check?orgId=${organization.id}&feature=${feature}`)
                const data = await res.json()
                setHasAccess(data.hasAccess)
            } catch (error) {
                console.error('Error checking feature:', error)
                setHasAccess(false)
            } finally {
                setLoading(false)
            }
        }

        checkFeature()
    }, [organization, feature])

    if (loading) {
        return <div className="animate-pulse bg-muted h-32 rounded-lg" />
    }

    if (!hasAccess) {
        return fallback || <UpgradePrompt feature={feature} />
    }

    return <>{children}</>
}

interface UpgradePromptProps {
    feature: string
}

const featureDetails: Record<string, { title: string; description: string; benefits: string[] }> = {
    vouchers: {
        title: "Voucher System",
        description: "Create discount codes and promotional vouchers for your customers",
        benefits: [
            "Unlimited voucher codes",
            "Percentage or fixed discounts",
            "Usage limits and expiry dates",
            "Track voucher performance"
        ]
    },
    multiprint: {
        title: "Multi-Print",
        description: "Allow customers to print multiple copies of their photos",
        benefits: [
            "Print up to 5 copies per session",
            "Customizable print limits",
            "Track paper usage",
            "Increase customer satisfaction"
        ]
    },
    paper_tracking: {
        title: "Paper Tracking",
        description: "Monitor paper levels and get low stock reminders",
        benefits: [
            "Real-time paper count",
            "Low stock alerts",
            "Usage analytics",
            "Never run out of paper"
        ]
    },
    priority_support: {
        title: "Priority Support",
        description: "Get faster response times and dedicated support",
        benefits: [
            "24/7 priority email support",
            "Faster response times",
            "Dedicated account manager",
            "Phone support available"
        ]
    },
    custom_branding: {
        title: "Custom Branding",
        description: "Customize the booth interface with your brand",
        benefits: [
            "Custom logo and colors",
            "Branded photo frames",
            "Custom welcome screen",
            "White-label experience"
        ]
    },
    advanced_analytics: {
        title: "Advanced Analytics",
        description: "Deep insights into your booth performance",
        benefits: [
            "Detailed revenue reports",
            "Customer behavior analytics",
            "Peak hours analysis",
            "Export to Excel/PDF"
        ]
    }
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
    const details = featureDetails[feature] || {
        title: "Premium Feature",
        description: "This feature is only available on the Pro plan",
        benefits: ["Unlock all premium features", "Priority support", "Advanced analytics"]
    }

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <IconSparkles className="h-5 w-5 text-primary" />
                    <CardTitle>{details.title}</CardTitle>
                </div>
                <CardDescription>{details.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <p className="text-sm font-medium">Included in Pro Plan:</p>
                    <ul className="space-y-1">
                        {details.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <IconCheck className="h-4 w-4 text-primary" />
                                {benefit}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex items-center gap-3 pt-2">
                    <Button asChild className="flex-1">
                        <Link href="/pricing">
                            Upgrade to Pro
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/pricing">
                            View Plans
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

interface PlanBadgeProps {
    plan: 'basic' | 'pro'
    className?: string
}

export function PlanBadge({ plan, className = "" }: PlanBadgeProps) {
    const isPro = plan === 'pro'

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isPro
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            } ${className}`}>
            {isPro && <IconSparkles className="h-3 w-3" />}
            {plan.toUpperCase()}
        </span>
    )
}
