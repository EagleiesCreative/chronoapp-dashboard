"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    IconRefresh,
    IconLoader,
    IconReceipt,
    IconBuildingBank
} from "@tabler/icons-react"
import { DataTable } from "@/components/ui/data-table"
import { columns, Payment } from "./columns"

interface PaymentData {
    payments: Payment[]
    count: number
    totalRevenue: number
    paidCount: number
    isAdmin: boolean
    userRevenueSharePercent: number
    netRevenue: number
    orgCut: number
    avgOrgPercent: number
    estimatedOrgEarnings: number
}


export default function PaymentsPage() {
    const { isLoaded: orgLoaded, organization, membership } = useOrganization()
    const { isLoaded: userLoaded, user } = useUser()
    const [payments, setPayments] = useState<Payment[]>([])
    const [data, setData] = useState<PaymentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [xenditBalance, setXenditBalance] = useState<number | null>(null)
    const [balanceLoading, setBalanceLoading] = useState(true)


    const isAdmin = membership?.role === "org:admin"

    const fetchPayments = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/payments')
            const responseData = await res.json()
            if (responseData.payments) {
                const paidPayments = (responseData.payments as Payment[]).filter(p => p.status === 'PAID' || p.status === 'SETTLED')
                setPayments(paidPayments)
            }
            setData(responseData)


        } catch (error) {
            console.error('Failed to fetch payments:', error)
            toast.error('Failed to fetch payments')
        } finally {
            setLoading(false)
        }
    }

    const fetchBalance = async () => {
        setBalanceLoading(true)
        try {
            const res = await fetch('/api/payments/balance')
            if (res.ok) {
                const balData = await res.json()
                setXenditBalance(balData.balance ?? null)
            } else {
                setXenditBalance(null)
            }
        } catch (err) {
            console.error('Error fetching Xendit balance:', err)
            setXenditBalance(null)
        } finally {
            setBalanceLoading(false)
        }
    }

    useEffect(() => {
        if (orgLoaded && userLoaded && organization && user) {
            fetchPayments()
            fetchBalance()
        }
    }, [orgLoaded, userLoaded, organization, user])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }



    if (!orgLoaded || !userLoaded) {
        return (
            <div className="p-4 md:p-6 space-y-4">
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
                <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
            </div>
        )
    }

    if (!organization) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-4 md:p-6">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>No Organization</CardTitle>
                        <CardDescription>
                            Please select or create an organization to view payments.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    // Available balance is fetched directly from Xendit (live)
    const availableBalance = xenditBalance ?? 0

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2 px-4">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight">Payments</h2>
                    <p className="text-sm text-muted-foreground">Finance overview for your organization</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => { fetchPayments(); fetchBalance() }} disabled={loading || balanceLoading} variant="outline">
                        {loading || balanceLoading ? <IconLoader className="mr-2 h-4 w-4 animate-spin" /> : <IconRefresh className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 px-4">
                {/* Paid Transactions */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Transactions</CardTitle>
                        <IconReceipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.paidCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Successful payments</p>
                    </CardContent>
                </Card>

                {/* Xendit Balance — live */}
                <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Xendit Balance</CardTitle>
                        <IconBuildingBank className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        {balanceLoading ? (
                            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                        ) : xenditBalance === null ? (
                            <div className="text-sm text-destructive">Failed to load</div>
                        ) : (
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(xenditBalance)}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Live from Xendit account</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History */}
            <div className="px-4 pb-4 md:px-6 md:pb-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Transaction History</CardTitle>
                        <CardDescription>
                            {isAdmin
                                ? "All payment transactions across your organization"
                                : "Your recent payment transactions"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && payments.length === 0 ? (
                            <div className="flex h-24 items-center justify-center">
                                <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <DataTable columns={columns} data={payments} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
