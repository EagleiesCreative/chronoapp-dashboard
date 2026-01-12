"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { IconSearch, IconHelp, IconUsers, IconDeviceDesktop, IconCash, IconFileText } from "@tabler/icons-react"

const faqData = [
    {
        category: "Getting Started",
        icon: IconHelp,
        questions: [
            {
                q: "How do I create a new booth?",
                a: "Navigate to Booth Management → Click 'Create Booth' button → Fill in booth details (name, location, price) → Assign to a member (optional) → Click 'Create Booth'. The booth will be immediately available for use."
            },
            {
                q: "How do I set up my organization?",
                a: "Your organization is automatically created when you sign up. To manage settings, go to Settings → Update your organization name, revenue share percentage, and other preferences."
            },
            {
                q: "What is the booth PIN for?",
                a: "The 6-digit booth PIN secures access to the booth app. Members need to enter this PIN to start using the booth. Set it in Booth Management → Select booth → Settings → App Security."
            }
        ]
    },
    {
        category: "Booth Management",
        icon: IconDeviceDesktop,
        questions: [
            {
                q: "How do I assign a booth to a member?",
                a: "Go to Booth Management → Click on a booth → Settings tab → Select a member from the 'Assign to Member' dropdown → Click 'Save Changes'. The assigned member will have access to this booth."
            },
            {
                q: "How do I monitor booth status?",
                a: "Go to Device Status page to see all booths, their online/offline status, IP addresses, and last heartbeat time. Green indicator means online, gray means offline."
            },
            {
                q: "How do I create vouchers for a booth?",
                a: "Navigate to Booth Management → Select booth → Vouchers tab → Enter voucher code, discount amount, and optional expiry → Click 'Create Voucher'. Customers can use this code for discounts."
            },
            {
                q: "Can I change booth pricing?",
                a: "Yes! Go to Booth Management → Select booth → Settings → Update the 'Price' field → Save Changes. The new price applies immediately to new sessions."
            }
        ]
    },
    {
        category: "Members & Permissions",
        icon: IconUsers,
        questions: [
            {
                q: "How do I invite new members?",
                a: "Go to Members page → Click 'Invite Member' → Enter their email address → Select role (Member or Admin) → Send invitation. They'll receive an email to join your organization."
            },
            {
                q: "What's the difference between Admin and Member roles?",
                a: "Admins have full access: create/edit booths, manage members, approve withdrawals, and view all analytics. Members can only access assigned booths and their own revenue data."
            },
            {
                q: "How do I set revenue share percentages?",
                a: "Go to Members → Click on a member → Edit their revenue share percentage (default 80%). This determines how much of the booth revenue goes to the member vs organization."
            }
        ]
    },
    {
        category: "Payments & Withdrawals",
        icon: IconCash,
        questions: [
            {
                q: "How do members withdraw their earnings?",
                a: "Members go to Settings → Add bank account details → Navigate to Payments → Click 'Withdraw Funds' → Enter amount → Submit. Admins must approve the withdrawal before processing."
            },
            {
                q: "How do I approve withdrawal requests?",
                a: "Go to Payments → Pending Approvals tab → Review withdrawal requests → Click 'Approve' or 'Reject'. Approved withdrawals are processed via Xendit automatically."
            },
            {
                q: "Where can I see transaction history?",
                a: "Navigate to Analytics or Payments page to view all transactions. You can filter by date range, booth, or payment status. Export data using the Reports feature."
            },
            {
                q: "What payment methods are supported?",
                a: "We support QRIS, bank transfers, e-wallets, and credit cards via Xendit integration. Customers can choose their preferred method at checkout."
            }
        ]
    },
    {
        category: "Reports & Analytics",
        icon: IconFileText,
        questions: [
            {
                q: "How do I generate monthly reports?",
                a: "Go to Reports → Select month and year → Choose format (Excel or PDF) → Click 'Generate Report'. Reports include revenue, transactions, and performance metrics."
            },
            {
                q: "Can I create custom date range reports?",
                a: "Yes! In Reports page, select 'Custom Range' → Pick start and end dates → Choose format → Generate. You can create reports for any period."
            },
            {
                q: "How do I download reports?",
                a: "Reports are automatically saved to cloud storage. Click the download button (Excel or PDF icon) next to any generated report to download it."
            },
            {
                q: "What analytics are available?",
                a: "Analytics page shows: total revenue, transaction count, hourly distribution, booth performance, member earnings, and revenue trends. All data is real-time."
            }
        ]
    },
    {
        category: "Subscription & Billing",
        icon: IconCash,
        questions: [
            {
                q: "What subscription plans are available?",
                a: "We offer two plans: Basic (free, 1 booth, core features) and Pro (Rp 299,000/month, up to 5 booths, vouchers, multi-print, paper tracking, and priority support)."
            },
            {
                q: "How do I upgrade to Pro?",
                a: "Go to Billing in the sidebar → Click 'Upgrade to Pro' → Complete payment via Xendit (bank transfer, e-wallet, or credit card). Your Pro features are activated immediately."
            },
            {
                q: "What happens if I exceed my booth limit?",
                a: "Basic plan allows 1 booth, Pro allows 5. If you try to create more booths than your plan allows, you'll see an upgrade prompt. Upgrade to Pro for more booths."
            },
            {
                q: "Can I cancel my subscription?",
                a: "Yes, go to Billing → Cancel Subscription. You'll retain Pro features until the end of your billing period, then automatically downgrade to Basic."
            },
            {
                q: "Why can't I create vouchers?",
                a: "Vouchers are a Pro feature. Upgrade to Pro plan to unlock discount codes, promotional vouchers, and usage tracking for your booths."
            }
        ]
    }
]

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState("")

    // Filter FAQ based on search
    const filteredFaq = faqData.map(category => ({
        ...category,
        questions: category.questions.filter(item =>
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.questions.length > 0)

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Help Center</h1>
                <p className="text-sm text-muted-foreground">
                    Find answers to common questions and learn how to use the platform
                </p>
            </div>

            {/* Search Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search for help..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* FAQ Sections */}
            <div className="grid gap-6">
                {filteredFaq.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <IconHelp className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                            <p className="text-sm text-muted-foreground mt-2">Try different keywords or browse all topics</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredFaq.map((category, idx) => {
                        const Icon = category.icon
                        return (
                            <Card key={idx}>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-5 w-5 text-primary" />
                                        <CardTitle>{category.category}</CardTitle>
                                    </div>
                                    <CardDescription>
                                        {category.questions.length} {category.questions.length === 1 ? 'question' : 'questions'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="single" collapsible className="w-full">
                                        {category.questions.map((item, qIdx) => (
                                            <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                                                <AccordionTrigger className="text-left">
                                                    {item.q}
                                                </AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground">
                                                    {item.a}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Quick Links */}
            <Card>
                <CardHeader>
                    <CardTitle>Still need help?</CardTitle>
                    <CardDescription>
                        Contact our support team for additional assistance
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm">
                        <strong>Email:</strong> support@eagleies.com
                    </p>
                    <p className="text-sm">
                        <strong>Response time:</strong> Within 24 hours
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
