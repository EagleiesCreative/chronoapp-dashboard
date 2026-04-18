"use client"

import { Suspense, useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

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
    description?: string // added for the new UI or we hardcode
    features: Record<string, boolean>
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

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

function BillingContent() {
    const { organization } = useOrganization()
    const searchParams = useSearchParams()
    
    // Data states
    const [loading, setLoading] = useState(true)
    const [booths, setBooths] = useState<Booth[]>([])
    const [plans, setPlans] = useState<Plan[]>([])
    const [history, setHistory] = useState<SubscriptionHistory[]>([])
    const [pendingInvoice, setPendingInvoice] = useState<PendingInvoice | null>(null)
    const [processingItem, setProcessingItem] = useState<string | null>(null)
    
    // UI states
    const [tab, setTab] = useState("overview");
    const [showCancelModal, setShowCancelModal] = useState<{show: boolean, booth: Booth|null}>({show: false, booth: null});
    const [showUpgradeModal, setShowUpgradeModal] = useState<{show: boolean, plan: Plan|null, booth: Booth|null}>({show: false, plan: null, booth: null});
    const [billing, setBilling] = useState("monthly");

    const tabs = ["overview", "plans", "invoices", "payment method"];

    useEffect(() => {
        const paymentStatus = searchParams.get('payment')
        if (paymentStatus === 'success') {
            toast.success('Payment successful! Your purchase is being activated.')
            // clean up url optionally here
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

    const handlePurchase = async (boothId: string, itemId: string) => {
        if (!organization) return
        
        const processingKey = `${boothId}-${itemId}`
        setProcessingItem(processingKey)

        try {
            const body: any = { orgId: organization.id, boothId, planId: itemId }
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
            setShowUpgradeModal({show: false, plan: null, booth: null})
        }
    }

    const handleCancel = async (boothId: string) => {
        if (!organization) return
        
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
        } finally {
            setShowCancelModal({show: false, booth: null})
        }
    }

    if (loading) {
        return (
            <div className="p-7">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-[#ede9e3] rounded w-48" />
                    <div className="h-64 bg-[#f8f5f1] rounded-xl" />
                </div>
            </div>
        )
    }

    // Default booth selection if any
    const activeBooth = booths[0]
    const currentPlan = activeBooth ? plans.find(p => p.id === (activeBooth.subscription_plan || 'growth')) || plans[0] : null
    const isActivePlan = activeBooth && activeBooth.subscription_status !== 'cancelled'

    // Formatting for display mock fallback data
    const mockDetailedPlans = plans.map(p => {
        const isCurrent = activeBooth ? p.id === activeBooth.subscription_plan || (p.id === 'growth' && !activeBooth.subscription_plan) : false
        return {
            ...p,
            period: p.price === 0 ? "Free forever" : "per month",
            desc: p.id === 'growth' ? "Perfect for getting started" : p.id === 'professional' ? "For growing studios" : "For large operations",
            featuresList: Object.entries(p.features).filter(([_, v]) => v).map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
            current: isCurrent,
            cta: isCurrent ? "Current plan" : p.id === 'growth' ? "Downgrade" : "Upgrade"
        }
    })

    return (
        <div className="p-7 max-w-[1200px] mx-auto w-full text-[#1a1a18]">
            {/* Header */}
            <div className="mb-6">
                <div className="text-[20px] font-semibold tracking-[-0.4px]">Billing</div>
                <div className="text-[13.5px] text-[#9a9288] mt-[3px]">Manage your subscription, invoices, and payment method of {organization?.name}</div>
            </div>

            {/* Pending Invoice Warning */}
            {pendingInvoice && (
                <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center text-orange-600 font-bold">!</div>
                        <div>
                            <div className="text-[14px] font-semibold text-orange-800">Payment Pending</div>
                            <div className="text-[13px] text-orange-700">Complete your active payment of {fmt(pendingInvoice.amount)}</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.location.href = pendingInvoice.invoice_url}
                        className="bg-orange-600 text-white border-none rounded-lg px-4 py-2 text-[13px] font-medium cursor-pointer hover:bg-orange-700"
                    >
                        Pay Now
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-[2px] mb-6 border-b border-[#ede9e3]">
                {tabs.map(t => (
                    <button 
                        key={t} 
                        onClick={() => setTab(t)} 
                        className={`h-[36px] px-[14px] bg-transparent border-none cursor-pointer capitalize text-[13.5px] -mb-[1px] ${
                            tab === t 
                                ? 'border-b-2 border-[#2d1f10] text-[#1a1a18] font-medium' 
                                : 'border-b-2 border-transparent text-[#9a9288] font-normal hover:text-[#1a1a18]'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && (
                <div className="flex flex-col gap-4">
                    {booths.length === 0 ? (
                        <div className="bg-[#fff] border border-[#ede9e3] rounded-[14px] p-8 text-center">
                            <div className="text-[15px] font-medium mb-1">No Booths Found</div>
                            <div className="text-[13px] text-[#9a9288]">Create a booth first to manage subscriptions.</div>
                        </div>
                    ) : (
                        booths.map(booth => {
                            const bPlan = plans.find(p => p.id === (booth.subscription_plan || 'growth')) || plans[0]
                            const bActive = booth.subscription_status !== 'cancelled'
                            const bMockFeatures = mockDetailedPlans.find(m => m.id === bPlan.id)?.featuresList || []

                            const expiryDate = booth.subscription_expires_at 
                                ? new Date(booth.subscription_expires_at) 
                                : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

                            return (
                                <div key={booth.id} className="flex flex-col gap-4 mb-8 last:mb-0">
                                    <div className="text-[14px] font-semibold text-[#6b6358] uppercase tracking-[0.05em] mb-[-4px] ml-1">{booth.name}</div>
                                    
                                    {/* Current plan banner */}
                                    <div className="bg-[#fff] border border-[#ede9e3] rounded-[14px] px-6 py-[22px] flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-[44px] h-[44px] rounded-xl bg-[#f5f0ea] flex items-center justify-center shrink-0">
                                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6b4f2a" strokeWidth="1.5" strokeLinecap="round">
                                                    <path d="M3 6h14v10H3zM3 9.5h14M7 6V4a3 3 0 016 0v2" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-[2px]">
                                                    <span className="text-[15px] font-semibold">{bPlan.name} plan</span>
                                                    <span className={`text-[11px] font-medium px-2 py-[2px] rounded-[20px] ${bActive ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                                                        {bActive ? 'Active' : 'Cancelled'}
                                                    </span>
                                                </div>
                                                <div className="text-[13px] text-[#9a9288]">
                                                    {bPlan.price === 0 ? 'Free' : `${fmt(bPlan.price)} / month`}
                                                    {` · ${bActive ? 'Renews' : 'Expires'} ${expiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setTab("plans")} 
                                                className="h-[32px] px-[14px] rounded-md bg-[#2d1f10] text-[#fff] border-none text-[13px] font-medium cursor-pointer"
                                            >
                                                Change plan
                                            </button>
                                            {bPlan.id !== 'growth' && bActive && (
                                                <button 
                                                    onClick={() => setShowCancelModal({show: true, booth})} 
                                                    className="h-[32px] px-[14px] rounded-md bg-transparent text-[#dc2626] border border-[#fecaca] text-[13px] cursor-pointer hover:bg-[#fef2f2]"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Usage stats (Mock data integration layout) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { label: "Devices used", val: "1 / 5", pct: 20, color: "#2d1f10" },
                                            { label: "Storage used", val: "2.1 GB / 10 GB", pct: 21, color: "#2563eb" },
                                            { label: "Sessions this month", val: "445 / unlimited", pct: null, color: "#16a34a" },
                                        ].map(u => (
                                            <div key={u.label} className="bg-[#fff] border border-[#ede9e3] rounded-xl px-[18px] py-4">
                                                <div className="text-[11.5px] text-[#b0a898] uppercase tracking-[0.07em] mb-2">{u.label}</div>
                                                <div className={`text-[16px] font-semibold ${u.pct != null ? 'mb-[10px]' : 'mb-0'}`}>{u.val}</div>
                                                {u.pct != null && (
                                                    <div className="h-1 rounded bg-[#f0ece6] overflow-hidden">
                                                        <div className="h-full rounded" style={{ width: `${u.pct}%`, backgroundColor: u.color }} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Plan features */}
                                    <div className="bg-[#fff] border border-[#ede9e3] rounded-[14px] px-6 py-5">
                                        <div className="text-[14px] font-semibold mb-[14px]">Included in your plan</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                                            {bMockFeatures.map((f: string) => (
                                                <div key={f} className="flex items-center gap-2 text-[13.5px] text-[#3a3330]">
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
                                                        <path d="M2 7l3.5 3.5L12 3.5" />
                                                    </svg>
                                                    {f}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* ── PLANS TAB ── */}
            {tab === "plans" && (
                <div>
                    <div className="flex items-center justify-center gap-[10px] mb-7">
                        <span className={`text-[13.5px] ${billing === "monthly" ? "text-[#1a1a18] font-medium" : "text-[#9a9288] font-normal"}`}>Monthly</span>
                        <div 
                            onClick={() => setBilling(b => b === "monthly" ? "yearly" : "monthly")}
                            className={`w-[42px] h-[24px] rounded-full cursor-pointer flex items-center px-[3px] transition-colors ${billing === "yearly" ? "bg-[#2d1f10]" : "bg-[#ddd]"}`}
                        >
                            <div className={`w-[18px] h-[18px] rounded-full bg-[#fff] transition-transform duration-200 ${billing === "yearly" ? "translate-x-[18px]" : "translate-x-0"}`} />
                        </div>
                        <span className={`text-[13.5px] flex items-center ${billing === "yearly" ? "text-[#1a1a18] font-medium" : "text-[#9a9288] font-normal"}`}>
                            Yearly <span className="text-[11.5px] px-[7px] py-[1px] rounded-[10px] bg-[#dcfce7] text-[#15803d] ml-1">Save 20%</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {mockDetailedPlans.map(plan => (
                            <div key={plan.id} className={`bg-[#fff] rounded-[14px] p-6 flex flex-col relative ${plan.current ? 'border-2 border-[#2d1f10]' : 'border border-[#ede9e3]'}`}>
                                {plan.current && (
                                    <div className="absolute -top-[1px] right-4 text-[11px] font-medium px-[10px] py-[3px] bg-[#2d1f10] text-[#fff] rounded-b-lg">
                                        Current
                                    </div>
                                )}
                                <div className="text-[15px] font-semibold mb-1">{plan.name}</div>
                                <div className="text-[12.5px] text-[#9a9288] mb-4">{plan.desc}</div>
                                <div className="mb-5">
                                    <span className="text-[26px] font-bold tracking-[-0.5px]">
                                        {plan.price === 0 ? "Free" : fmt(billing === "yearly" ? Math.round(plan.price * 0.8) : plan.price)}
                                    </span>
                                    {plan.price > 0 && <span className="text-[12.5px] text-[#9a9288] ml-1">/ mo</span>}
                                </div>
                                <div className="flex-1 flex flex-col gap-2 mb-5">
                                    {plan.featuresList.map((f: string) => (
                                        <div key={f} className="flex items-start gap-[7px] text-[13px] text-[#3a3330]">
                                            <svg className="shrink-0 mt-[2px]" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke={plan.current ? "#2d1f10" : "#16a34a"} strokeWidth="2" strokeLinecap="round">
                                                <path d="M2 6.5l3 3L11 3" />
                                            </svg>
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { 
                                        if (!plan.current && plan.id !== "growth") { 
                                            window.open("https://framrstudio.com/billing", "_blank"); 
                                        } 
                                    }}
                                    className={`w-full h-[36px] rounded-lg text-[13.5px] font-medium border ${
                                        plan.current 
                                            ? "bg-[#f5f0ea] text-[#6b4f2a] border-transparent cursor-default" 
                                            : plan.id === "professional" 
                                                ? "bg-[#2d1f10] text-[#fff] border-transparent cursor-pointer" 
                                                : "bg-[#fff] text-[#1a1a18] border-[#ede9e3] cursor-pointer"
                                    }`}
                                >
                                    {plan.cta}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* ── Cancel Subscription Section ── */}
                    {activeBooth && activeBooth.subscription_plan && activeBooth.subscription_plan !== 'growth' && activeBooth.subscription_status !== 'cancelled' && (
                        <div className="mt-8 border border-[#fecaca] rounded-[14px] px-6 py-5 bg-[#fff]">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="text-[14px] font-semibold text-[#dc2626] mb-[5px]">Cancel subscription</div>
                                    <div className="text-[13px] text-[#9a9288] leading-[1.6] max-w-[480px]">
                                        Cancelling won&apos;t charge you again. You&apos;ll keep full access until your current period ends
                                        {activeBooth.subscription_expires_at && (
                                            <> on <span className="font-medium text-[#3a3330]">{new Date(activeBooth.subscription_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></>
                                        )}, then your booth will revert to the free Growth plan.
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCancelModal({ show: true, booth: activeBooth })}
                                    className="h-[34px] px-[16px] shrink-0 rounded-lg bg-transparent text-[#dc2626] border border-[#fecaca] text-[13px] font-medium cursor-pointer hover:bg-[#fef2f2] transition-colors"
                                >
                                    Cancel subscription
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Already cancelled notice */}
                    {activeBooth && activeBooth.subscription_status === 'cancelled' && activeBooth.subscription_plan !== 'growth' && (
                        <div className="mt-8 border border-[#ede9e3] rounded-[14px] px-6 py-5 bg-[#faf8f5]">
                            <div className="text-[13.5px] text-[#6b6358] leading-[1.6]">
                                <span className="inline-flex items-center gap-[6px] font-medium text-[#dc2626] mb-1">
                                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="5.5"/><path d="M6.5 4v3M6.5 9h.01"/></svg>
                                    Subscription cancelled
                                </span>
                                <br />
                                Your plan is cancelled but you retain access until{' '}
                                {activeBooth.subscription_expires_at
                                    ? <strong>{new Date(activeBooth.subscription_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                                    : 'end of billing period'
                                }. No further charges will be made.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── INVOICES TAB ── */}
            {tab === "invoices" && (
                <div className="bg-[#fff] border border-[#ede9e3] rounded-[14px] overflow-hidden">
                    <div className="px-5 py-[14px] border-b border-[#f0ece6] flex justify-between items-center bg-[#fff]">
                        <div className="text-[14px] font-semibold">All invoices</div>
                        <button className="h-[30px] px-3 rounded-md border border-[#ede9e3] bg-[#fff] text-[12.5px] text-[#6b6358] cursor-pointer flex items-center gap-[5px] hover:bg-[#faf8f5]">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                <path d="M8 2v10M4 9l4 4 4-4M2 14h12" />
                            </svg>
                            Export all
                        </button>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[#f0ece6]">
                                    {["Invoice", "Description", "Amount", "Date", "Status", ""].map(h => (
                                        <th key={h} className="px-5 py-[9px] text-[11px] font-semibold text-[#b0a898] text-left tracking-[0.07em] uppercase whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-6 text-[13px] text-[#9a9288]">No billing history available yet.</td>
                                    </tr>
                                ) : (
                                    history.map((entry, i) => (
                                        <tr key={entry.id} className={`hover:bg-[#faf8f5] transition-colors ${i < history.length - 1 ? 'border-b border-[#f8f5f1]' : ''}`}>
                                            <td className="px-5 py-[13px]">
                                                <span className="font-mono text-[12px] text-[#6b6358] bg-[#f5f2ee] px-[7px] py-[3px] rounded-md whitespace-nowrap">
                                                    {entry.payment_id || entry.id.substring(0,8)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-[13px] text-[13.5px] text-[#1a1a18] whitespace-nowrap capitalize">{entry.action.replace(/_/g, ' ')}</td>
                                            <td className="px-5 py-[13px] text-[13.5px] font-medium whitespace-nowrap">{fmt(entry.amount)}</td>
                                            <td className="px-5 py-[13px] text-[13px] text-[#6b6358] whitespace-nowrap">
                                                {new Date(entry.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-[13px]">
                                                <span className={`text-[11.5px] px-[9px] py-[3px] rounded-full font-medium whitespace-nowrap ${entry.action.includes('failed') ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#dcfce7] text-[#15803d]'}`}>
                                                    {entry.action.includes('failed') ? 'Failed' : 'Success'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-[13px] text-right">
                                                <button className="h-[26px] px-[10px] rounded-md border border-[#ede9e3] bg-[#fff] text-[12px] text-[#6b6358] cursor-pointer hover:bg-[#faf8f5]">Download</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── PAYMENT METHOD TAB ── */}
            {tab === "payment method" && (
                <div className="flex flex-col gap-4 max-w-[560px]">
                    <div className="bg-[#fff] border border-[#ede9e3] rounded-[14px] p-6">
                        <div className="text-[14px] font-semibold mb-4">Current payment method</div>
                        <div className="flex items-center justify-between p-[14px] px-4 border border-[#ede9e3] rounded-[10px] bg-[#faf8f5]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-[26px] rounded-[5px] bg-[#e8ddd0] flex items-center justify-center shrink-0">
                                    <svg width="18" height="14" viewBox="0 0 20 16" fill="none" stroke="#6b4f2a" strokeWidth="1.4" strokeLinecap="round">
                                        <rect x="1" y="2" width="18" height="12" rx="2" />
                                        <path d="M1 6h18" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-[13.5px] font-medium">QRIS — Bank Transfer</div>
                                    <div className="text-[12px] text-[#b0a898] mt-[1px]">Provided by Xendit</div>
                                </div>
                            </div>
                            <span className="text-[11.5px] px-2 py-[2px] rounded-[20px] bg-[#dcfce7] text-[#15803d] font-medium">Active</span>
                        </div>
                    </div>

                    <div className="bg-[#fff] border border-[#fecaca] rounded-[14px] px-6 py-[18px]">
                        <div className="text-[14px] font-semibold mb-1 text-[#dc2626]">Danger zone</div>
                        <div className="text-[13px] text-[#9a9288] mb-[14px]">Cancelling your plan will downgrade you to Growth at end of cycle.</div>
                        <button 
                            onClick={() => setShowCancelModal({show: true, booth: activeBooth})} 
                            className="h-[34px] px-[14px] rounded-lg bg-transparent text-[#dc2626] border border-[#fecaca] text-[13px] cursor-pointer hover:bg-[#fef2f2]"
                        >
                            Cancel subscription
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelModal.show && showCancelModal.booth && (
                <div className="fixed inset-0 bg-[#0000004d] flex items-center justify-center z-[100]">
                    <div className="bg-[#fff] rounded-2xl p-7 w-[380px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-10 h-10 rounded-[10px] bg-[#fee2e2] flex items-center justify-center mb-[14px]">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round">
                                <path d="M9 3v6M9 12v.5M3 15L9 3l6 12H3z" />
                            </svg>
                        </div>
                        <div className="text-[16px] font-semibold mb-[6px]">Cancel subscription?</div>
                        <div className="text-[13.5px] text-[#6b6358] leading-[1.6] mb-[22px]">
                            Your Premium plan on <strong>{showCancelModal.booth.name}</strong> will remain active until <strong>{showCancelModal.booth.subscription_expires_at ? new Date(showCancelModal.booth.subscription_expires_at).toLocaleDateString() : 'the end of cycle'}</strong>. After that, you'll be downgraded to the free Growth plan.
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowCancelModal({show: false, booth: null})} 
                                className="flex-1 h-[36px] rounded-lg border border-[#ede9e3] bg-transparent text-[13.5px] text-[#6b6358] cursor-pointer hover:bg-[#faf8f5]"
                            >
                                Keep plan
                            </button>
                            <button 
                                onClick={() => handleCancel(showCancelModal.booth!.id)} 
                                className="flex-1 h-[36px] rounded-lg bg-[#dc2626] text-[#fff] border-none text-[13.5px] font-medium cursor-pointer hover:bg-[#b91c1c]"
                            >
                                Yes, cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal.show && showUpgradeModal.plan && showUpgradeModal.booth && (
                <div className="fixed inset-0 bg-[#0000004d] flex items-center justify-center z-[100]">
                    <div className="bg-[#fff] rounded-2xl p-7 w-[380px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-[16px] font-semibold mb-1">Upgrade {showUpgradeModal.booth.name} to {showUpgradeModal.plan.name}</div>
                        <div className="text-[13.5px] text-[#6b6358] mb-5">
                            You'll be billed {fmt(billing === "yearly" ? Math.round(showUpgradeModal.plan.price * 0.8) : showUpgradeModal.plan.price)} per month starting today.
                        </div>
                        <div className="bg-[#faf8f5] rounded-[10px] px-4 py-[14px] mb-5">
                            {/* @ts-ignore - using the mock extension for display */}
                            {showUpgradeModal.plan.featuresList?.map((f: string) => (
                                <div key={f} className="flex items-center gap-[7px] text-[13px] text-[#3a3330] mb-2 last:mb-0">
                                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
                                        <path d="M2 6.5l3 3L11 3" />
                                    </svg>
                                    {f}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowUpgradeModal({show: false, plan: null, booth: null})} 
                                className="flex-1 h-[36px] rounded-lg border border-[#ede9e3] bg-transparent text-[13.5px] text-[#6b6358] cursor-pointer hover:bg-[#faf8f5]"
                                disabled={processingItem !== null}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handlePurchase(showUpgradeModal.booth!.id, showUpgradeModal.plan!.id)} 
                                className="flex-1 h-[36px] rounded-lg bg-[#2d1f10] text-[#fff] border-none text-[13.5px] font-medium cursor-pointer hover:bg-[#1a1a18] flex items-center justify-center"
                                disabled={processingItem !== null}
                            >
                                {processingItem !== null ? 'Processing...' : 'Confirm upgrade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className="p-7">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-[#ede9e3] rounded w-48" />
                    <div className="h-64 bg-[#f8f5f1] rounded-xl" />
                </div>
            </div>
        }>
            <BillingContent />
        </Suspense>
    )
}
