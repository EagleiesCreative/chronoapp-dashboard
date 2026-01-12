"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconCheck, IconSparkles, IconX } from "@tabler/icons-react"
import Link from "next/link"

const plans = [
    {
        id: "basic",
        name: "Basic",
        price: 0,
        description: "Perfect for getting started",
        features: [
            { name: "1 booth", included: true },
            { name: "Basic analytics", included: true },
            { name: "Standard support", included: true },
            { name: "Core photobooth features", included: true },
            { name: "Voucher system", included: false },
            { name: "Multi-print", included: false },
            { name: "Paper tracking", included: false },
            { name: "Priority support", included: false },
        ],
        cta: "Get Started",
        popular: false,
    },
    {
        id: "pro",
        name: "Pro",
        price: 299000,
        description: "For growing businesses",
        features: [
            { name: "Up to 5 booths", included: true },
            { name: "Advanced analytics", included: true },
            { name: "Priority support", included: true },
            { name: "All core features", included: true },
            { name: "Voucher system", included: true },
            { name: "Multi-print functionality", included: true },
            { name: "Paper tracking & reminders", included: true },
            { name: "Custom branding", included: true },
        ],
        cta: "Upgrade to Pro",
        popular: true,
    },
]

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            <div className="container mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Choose the plan that fits your business. Upgrade or downgrade anytime.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
                    {plans.map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative ${plan.popular
                                    ? "border-2 border-primary shadow-lg scale-105"
                                    : "border"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                        <IconSparkles className="h-4 w-4" />
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <CardHeader className="text-center pb-8 pt-8">
                                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                                <div className="mt-4">
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-bold">
                                            {plan.price === 0 ? "Free" : `Rp ${plan.price.toLocaleString('id-ID')}`}
                                        </span>
                                        {plan.price > 0 && (
                                            <span className="text-muted-foreground">/month</span>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-3">
                                            {feature.included ? (
                                                <IconCheck className="h-5 w-5 text-primary flex-shrink-0" />
                                            ) : (
                                                <IconX className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            )}
                                            <span className={feature.included ? "" : "text-muted-foreground"}>
                                                {feature.name}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    asChild
                                    className="w-full"
                                    variant={plan.popular ? "default" : "outline"}
                                    size="lg"
                                >
                                    <Link href={plan.id === "basic" ? "/sign-up" : "/dashboard/billing"}>
                                        {plan.cta}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-8">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
                            <p className="text-muted-foreground">
                                Yes! You can upgrade to Pro or downgrade to Basic at any time from your billing settings.
                                Changes take effect immediately.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">What happens if I exceed my booth limit?</h3>
                            <p className="text-muted-foreground">
                                You'll need to upgrade to Pro to create more booths. Pro plan supports up to 5 booths.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">How does billing work?</h3>
                            <p className="text-muted-foreground">
                                Pro plan is billed monthly via Xendit. You can pay using bank transfer, e-wallet, or credit card.
                                Invoices are sent automatically each month.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Can I cancel my subscription?</h3>
                            <p className="text-muted-foreground">
                                Yes, you can cancel anytime. You'll retain Pro features until the end of your billing period,
                                then automatically downgrade to Basic.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                            <p className="text-muted-foreground">
                                We offer a 7-day money-back guarantee. If you're not satisfied, contact support for a full refund.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-16 text-center">
                    <Card className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle>Need help choosing?</CardTitle>
                            <CardDescription>
                                Contact our team to discuss which plan is right for your business
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center">
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/help">Contact Support</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
