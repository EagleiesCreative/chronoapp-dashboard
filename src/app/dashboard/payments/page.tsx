"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    IconRefresh,
    IconLoader,
    IconCash,
    IconReceipt,
    IconPercentage,
    IconBuildingBank,
    IconArrowDown,
    IconTrendingUp,
    IconWallet
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

interface Withdrawal {
    id: string
    reference_id: string
    amount: number
    bank_code: string
    account_number: string
    account_holder_name: string
    status: string
    approval_status: string
    created_at: string
    xendit_payout_id: string | null
    rejection_reason: string | null
    user_id: string
}

const BANK_OPTIONS = [
    { code: 'BCA', name: 'BCA' },
    { code: 'BNI', name: 'BNI' },
    { code: 'BRI', name: 'BRI' },
    { code: 'MANDIRI', name: 'Mandiri' },
    { code: 'CIMB', name: 'CIMB Niaga' },
    { code: 'PERMATA', name: 'Permata' },
    { code: 'DANAMON', name: 'Danamon' },
    { code: 'BSI', name: 'BSI' },
    { code: 'OVO', name: 'OVO (E-Wallet)' },
    { code: 'DANA', name: 'DANA (E-Wallet)' },
    { code: 'GOPAY', name: 'GoPay (E-Wallet)' },
]

export default function PaymentsPage() {
    const { isLoaded: orgLoaded, organization, membership } = useOrganization()
    const { isLoaded: userLoaded, user } = useUser()
    const [payments, setPayments] = useState<Payment[]>([])
    const [data, setData] = useState<PaymentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
    const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)

    // Withdraw dialog state
    const [withdrawOpen, setWithdrawOpen] = useState(false)
    const [withdrawAmount, setWithdrawAmount] = useState("")
    const [bankCode, setBankCode] = useState("")
    const [accountNumber, setAccountNumber] = useState("")
    const [accountHolderName, setAccountHolderName] = useState("")
    const [isWithdrawing, setIsWithdrawing] = useState(false)
    const [withdrawnAmount, setWithdrawnAmount] = useState(0)

    // Saved payment info state
    const [savedPaymentInfo, setSavedPaymentInfo] = useState<any>(null)
    const [useSavedInfo, setUseSavedInfo] = useState(true)
    const [hasSavedPaymentInfo, setHasSavedPaymentInfo] = useState(false)

    // Account validation state
    const [accountError, setAccountError] = useState("")
    const [isVerifying, setIsVerifying] = useState(false)
    const [isVerified, setIsVerified] = useState(false)
    const [verifiedName, setVerifiedName] = useState("")

    // Approval workflow state
    const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([])
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)

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

            // Fetch withdrawal history to calculate already withdrawn
            const withdrawRes = await fetch('/api/withdraw')
            const withdrawData = await withdrawRes.json()
            if (withdrawData.withdrawals) {
                setWithdrawals(withdrawData.withdrawals)
                // Only count withdrawals by the current role (admin counts admin withdrawals, members count their own)
                const roleWithdrawals = withdrawData.withdrawals.filter((w: any) =>
                    !['REJECTED', 'CANCELLED'].includes(w.approval_status) &&
                    w.is_admin === (membership?.role === "org:admin")
                )
                const withdrawn = roleWithdrawals.reduce((sum: number, w: any) => sum + (w.amount || 0), 0)
                setWithdrawnAmount(withdrawn)
            }

            // Fetch saved payment info
            const paymentInfoRes = await fetch('/api/payment-info')
            const paymentInfoData = await paymentInfoRes.json()
            if (paymentInfoData.paymentInfo) {
                setSavedPaymentInfo(paymentInfoData.paymentInfo)
                setHasSavedPaymentInfo(true)
                // Pre-fill form with saved info
                setBankCode(paymentInfoData.paymentInfo.bankCode)
                setAccountNumber(paymentInfoData.paymentInfo.accountNumber)
                setAccountHolderName(paymentInfoData.paymentInfo.accountHolderName)
                setIsVerified(true) // Auto-verify saved info
            } else {
                setHasSavedPaymentInfo(false)
                setUseSavedInfo(false) // Force manual entry if no saved info
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error)
            toast.error('Failed to fetch payments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (orgLoaded && userLoaded && organization && user) {
            fetchPayments()
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

    const handleWithdraw = async () => {
        const amount = parseInt(withdrawAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount")
            return
        }
        if (!bankCode || !accountNumber || !accountHolderName) {
            toast.error("Please fill in all bank details")
            return
        }

        setIsWithdrawing(true)
        try {
            const res = await fetch('/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    bankCode,
                    accountNumber,
                    accountHolderName,
                })
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Withdrawal failed')
            }

            toast.success('Withdrawal request submitted! Awaiting admin approval.')
            setWithdrawOpen(false)
            setWithdrawAmount("")
            setBankCode("")
            setAccountNumber("")
            setAccountHolderName("")
            setAccountError("")
            setIsVerified(false)
            setVerifiedName("")
            fetchPayments() // Refresh data
        } catch (error: any) {
            console.error('Withdrawal error:', error)
            toast.error(error.message || 'Failed to process withdrawal')
        } finally {
            setIsWithdrawing(false)
        }
    }

    const handleVerifyAccount = async () => {
        if (!bankCode || !accountNumber) {
            toast.error('Please select bank and enter account number')
            return
        }

        setIsVerifying(true)
        setAccountError("")
        setIsVerified(false)
        setVerifiedName("")

        try {
            const res = await fetch('/api/validate-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankCode, accountNumber })
            })

            const result = await res.json()

            if (!result.valid) {
                setAccountError(result.error || 'Invalid account number')
                return
            }

            // Basic validation passed
            setIsVerified(true)
            toast.success('Account format is valid!')
        } catch (error: any) {
            console.error('Validation error:', error)
            setAccountError('Validation failed. Please try again.')
        } finally {
            setIsVerifying(false)
        }
    }

    const handleApprove = async (withdrawalId: string) => {
        setIsProcessing(true)
        try {
            const res = await fetch('/api/admin/withdrawals/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ withdrawalId })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            toast.success('Withdrawal approved successfully')
            fetchPayments()
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve withdrawal')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!rejectingId || !rejectionReason.trim()) {
            toast.error('Please provide a rejection reason')
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/admin/withdrawals/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    withdrawalId: rejectingId,
                    reason: rejectionReason
                })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            toast.success('Withdrawal rejected and amount refunded')
            setRejectDialogOpen(false)
            setRejectingId(null)
            setRejectionReason("")
            fetchPayments()
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject withdrawal')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleBatchDisburse = async () => {
        if (selectedWithdrawals.length === 0) {
            toast.error('Please select withdrawals to disburse')
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/admin/withdrawals/batch-disburse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ withdrawalIds: selectedWithdrawals })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            toast.success(result.message || 'Batch disbursement completed')
            setSelectedWithdrawals([])
            fetchPayments()
        } catch (error: any) {
            toast.error(error.message || 'Failed to process batch disbursement')
        } finally {
            setIsProcessing(false)
        }
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

    // Calculate available balance for withdrawal
    const availableBalance = isAdmin
        ? (data?.estimatedOrgEarnings || 0) - withdrawnAmount
        : (data?.netRevenue || 0) - withdrawnAmount

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2 px-4">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight">Payments</h2>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin ? "Finance overview for your organization" : "Your earnings and transactions"}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant={isAdmin ? "default" : "secondary"}>
                        {isAdmin ? "Admin View" : "Member View"}
                    </Badge>
                    <Button onClick={fetchPayments} disabled={loading} variant="outline">
                        {loading ? <IconLoader className="mr-2 h-4 w-4 animate-spin" /> : <IconRefresh className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Different for Admin vs Member */}
            {isAdmin ? (
                /* Admin Finance View */
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4">
                    {/* Gross Revenue */}
                    <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                            <IconCash className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</div>
                            <p className="text-xs text-muted-foreground">Total from all transactions</p>
                        </CardContent>
                    </Card>

                    {/* Organization Earnings */}
                    <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Org Earnings (Est.)</CardTitle>
                            <IconBuildingBank className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(data?.estimatedOrgEarnings || 0)}</div>
                            <p className="text-xs text-muted-foreground">~{data?.avgOrgPercent || 20}% avg. commission</p>
                        </CardContent>
                    </Card>

                    {/* Total Transactions */}
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

                    {/* Avg Transaction Value */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(data?.paidCount ? Math.round((data?.totalRevenue || 0) / data.paidCount) : 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">Per transaction average</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                /* Member Earnings View */
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4">
                    {/* Gross Revenue */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                            <IconCash className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</div>
                            <p className="text-xs text-muted-foreground">All-time total before deductions</p>
                        </CardContent>
                    </Card>

                    {/* Your Share Percentage */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Your Share</CardTitle>
                            <IconPercentage className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.userRevenueSharePercent || 80}%</div>
                            <p className="text-xs text-muted-foreground">Revenue share rate</p>
                        </CardContent>
                    </Card>

                    {/* Already Withdrawn */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Already Withdrawn</CardTitle>
                            <IconWallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(withdrawnAmount)}</div>
                            <p className="text-xs text-muted-foreground">Total withdrawn to date</p>
                        </CardContent>
                    </Card>

                    {/* Available Balance (Net Earnings - Withdrawn) */}
                    <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                            <IconBuildingBank className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance)}</div>
                            <p className="text-xs text-muted-foreground">
                                Net: {formatCurrency(data?.netRevenue || 0)} - Withdrawn: {formatCurrency(withdrawnAmount)}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Withdraw Section */}
            <div className="px-4">
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-primary/10">
                                    <IconWallet className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Available for Withdrawal</p>
                                    <p className="text-2xl font-bold">{formatCurrency(Math.max(0, availableBalance))}</p>
                                    {withdrawnAmount > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Already withdrawn: {formatCurrency(withdrawnAmount)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        size="lg"
                                        disabled={availableBalance <= 0}
                                        className="gap-2"
                                    >
                                        <IconWallet className="h-4 w-4" />
                                        Withdraw Funds
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <IconWallet className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <DialogTitle className="text-xl">Withdraw Funds</DialogTitle>
                                                <DialogDescription className="text-xs">
                                                    Secure transfer powered by Xendit
                                                </DialogDescription>
                                            </div>
                                        </div>

                                        {/* Saved Payment Info Banner */}
                                        {!hasSavedPaymentInfo && (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                                                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs text-blue-700 dark:text-blue-300">
                                                    💡 Tip: <a href="/dashboard/settings" className="underline font-semibold">Save payment info in Settings</a> to speed up future withdrawals
                                                </span>
                                            </div>
                                        )}

                                        {/* Security Badge */}
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                                                Encrypted & Secure Transaction
                                            </span>
                                        </div>

                                        {/* Balance Info */}
                                        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Available Balance</span>
                                                <span className="text-2xl font-bold text-primary">
                                                    {formatCurrency(Math.max(0, availableBalance))}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {isAdmin ? "Organization earnings" : `Your ${data?.userRevenueSharePercent}% share`}
                                            </p>
                                        </div>
                                    </DialogHeader>

                                    <div className="space-y-4 py-2">
                                        {/* Toggle between saved and manual entry */}
                                        {hasSavedPaymentInfo && (
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                <div className="flex items-center gap-2">
                                                    <IconBuildingBank className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">
                                                        {useSavedInfo ? 'Using saved payment info' : 'Manual entry'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setUseSavedInfo(!useSavedInfo)
                                                            if (!useSavedInfo && savedPaymentInfo) {
                                                                // Switch to saved info
                                                                setBankCode(savedPaymentInfo.bankCode)
                                                                setAccountNumber(savedPaymentInfo.accountNumber)
                                                                setAccountHolderName(savedPaymentInfo.accountHolderName)
                                                                setIsVerified(true)
                                                            } else {
                                                                // Switch to manual
                                                                setBankCode("")
                                                                setAccountNumber("")
                                                                setAccountHolderName("")
                                                                setIsVerified(false)
                                                            }
                                                        }}
                                                    >
                                                        {useSavedInfo ? 'Enter manually' : 'Use saved info'}
                                                    </Button>
                                                    <a href="/dashboard/settings" className="text-xs text-primary hover:underline">
                                                        Update in Settings
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {/* Amount Input */}
                                        <div className="space-y-2">
                                            <Label htmlFor="amount" className="text-sm font-semibold">
                                                Withdrawal Amount (IDR) *
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                    Rp
                                                </span>
                                                <Input
                                                    id="amount"
                                                    type="text"
                                                    placeholder="0"
                                                    value={withdrawAmount ? parseInt(withdrawAmount).toLocaleString('id-ID') : ''}
                                                    onChange={(e) => {
                                                        // Remove all non-digit characters and store raw number
                                                        const rawValue = e.target.value.replace(/\D/g, '')
                                                        setWithdrawAmount(rawValue)
                                                    }}
                                                    className="pl-10 text-lg font-semibold"
                                                />
                                            </div>

                                            {/* Quick percentage buttons */}
                                            <div className="flex gap-2">
                                                {[25, 50, 75, 100].map((percentage) => (
                                                    <Button
                                                        key={percentage}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs"
                                                        onClick={() => {
                                                            const amount = Math.floor(availableBalance * (percentage / 100))
                                                            setWithdrawAmount(amount.toString())
                                                        }}
                                                        disabled={availableBalance <= 0}
                                                    >
                                                        {percentage}%
                                                    </Button>
                                                ))}
                                            </div>

                                            {withdrawAmount && parseInt(withdrawAmount) > availableBalance && (
                                                <p className="text-xs text-red-500">
                                                    Amount exceeds available balance
                                                </p>
                                            )}
                                        </div>

                                        {/* Bank Selection */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold">
                                                Destination Bank / E-Wallet *
                                            </Label>
                                            <Select value={bankCode} onValueChange={setBankCode} disabled={useSavedInfo && hasSavedPaymentInfo}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select your bank or e-wallet" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                        Banks
                                                    </div>
                                                    {BANK_OPTIONS.filter(b => !['OVO', 'DANA', 'GOPAY'].includes(b.code)).map((bank) => (
                                                        <SelectItem key={bank.code} value={bank.code}>
                                                            <div className="flex items-center gap-2">
                                                                <IconBuildingBank className="h-4 w-4" />
                                                                {bank.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                                                        E-Wallets
                                                    </div>
                                                    {BANK_OPTIONS.filter(b => ['OVO', 'DANA', 'GOPAY'].includes(b.code)).map((bank) => (
                                                        <SelectItem key={bank.code} value={bank.code}>
                                                            <div className="flex items-center gap-2">
                                                                <IconWallet className="h-4 w-4" />
                                                                {bank.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Account Number */}
                                        <div className="space-y-2">
                                            <Label htmlFor="accountNumber" className="text-sm font-semibold">
                                                Account Number *
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="accountNumber"
                                                    placeholder="Enter your account number"
                                                    value={accountNumber}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '')
                                                        setAccountNumber(value)
                                                        setAccountError("")
                                                        setIsVerified(false)
                                                        setVerifiedName("")
                                                    }}
                                                    disabled={useSavedInfo && hasSavedPaymentInfo}
                                                    className={`font-mono flex-1 ${accountError ? 'border-red-500' : isVerified ? 'border-green-500' : ''}`}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleVerifyAccount}
                                                    disabled={isVerifying || !bankCode || !accountNumber || (useSavedInfo && hasSavedPaymentInfo)}
                                                    className="h-10"
                                                >
                                                    {isVerifying ? (
                                                        <IconLoader className="h-4 w-4 animate-spin" />
                                                    ) : isVerified ? (
                                                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        "Verify"
                                                    )}
                                                </Button>
                                            </div>
                                            {accountError && (
                                                <p className="text-xs text-red-500">{accountError}</p>
                                            )}
                                            {isVerified && (
                                                <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-xs text-green-700 dark:text-green-300">
                                                        ✓ Account number format is valid
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Account Holder Name */}
                                        <div className="space-y-2">
                                            <Label htmlFor="accountHolder" className="text-sm font-semibold">
                                                Account Holder Name *
                                            </Label>
                                            <Input
                                                id="accountHolder"
                                                placeholder="Enter name EXACTLY as registered in bank"
                                                value={accountHolderName}
                                                onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                                                disabled={useSavedInfo && hasSavedPaymentInfo}
                                                className="uppercase"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                ⚠️ Must match your bank account registration exactly
                                            </p>
                                        </div>

                                        {/* Summary */}
                                        {withdrawAmount && bankCode && accountNumber && accountHolderName && (
                                            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    Transaction Summary
                                                </p>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Withdrawal Amount</span>
                                                        <span className="font-semibold">{formatCurrency(parseInt(withdrawAmount) || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Bank Admin Fee</span>
                                                        <span className="font-semibold text-red-500">-{formatCurrency(2500)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">VAT (11%)</span>
                                                        <span className="font-semibold text-red-500">-{formatCurrency(275)}</span>
                                                    </div>
                                                    <div className="border-t pt-2 mt-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-sm font-semibold">You'll Receive</span>
                                                            <span className="font-bold text-green-600">
                                                                {formatCurrency(Math.max(0, (parseInt(withdrawAmount) || 0) - 2775))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between text-sm pt-1">
                                                        <span className="text-muted-foreground">To</span>
                                                        <span className="font-semibold">{BANK_OPTIONS.find(b => b.code === bankCode)?.name}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Account</span>
                                                        <span className="font-mono">{accountNumber}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Name</span>
                                                        <span className="font-semibold">{accountHolderName}</span>
                                                    </div>
                                                    <div className="border-t pt-2 mt-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">Remaining Balance</span>
                                                            <span className="font-bold text-primary">
                                                                {formatCurrency(Math.max(0, availableBalance - (parseInt(withdrawAmount) || 0)))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Warning Notice */}
                                        <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                                            <svg className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <div className="text-xs text-amber-700 dark:text-amber-300">
                                                <p className="font-bold mb-1">⚠️ Important: Verify Your Information</p>
                                                <p>Please double-check your bank details before submitting. <strong>Incorrect account information may result in failed or misdirected transfers that cannot be reversed.</strong> Any errors in account number or holder name are the user's responsibility.</p>
                                            </div>
                                        </div>

                                        {/* Processing Info */}
                                        <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                                            <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="text-xs text-blue-700 dark:text-blue-300">
                                                <p className="font-medium mb-1">Processing Time</p>
                                                <p>Withdrawals require admin approval and are typically processed within 1-3 business days.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter className="gap-4 sm:gap-0">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setWithdrawOpen(false)
                                                setWithdrawAmount("")
                                                setBankCode("")
                                                setAccountNumber("")
                                                setAccountHolderName("")
                                            }}
                                            disabled={isWithdrawing}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleWithdraw}
                                            disabled={isWithdrawing || !withdrawAmount || !bankCode || !accountNumber || !accountHolderName || (parseInt(withdrawAmount) || 0) > availableBalance}
                                            className="gap-2"
                                        >
                                            {isWithdrawing ? (
                                                <>
                                                    <IconLoader className="h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Confirm Withdrawal
                                                </>
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Info for Admin */}
            {isAdmin && (
                <div className="px-4">
                    <Card className="border-dashed">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <IconPercentage className="h-4 w-4" />
                                    Avg. Org Commission: <strong>{data?.avgOrgPercent || 20}%</strong>
                                </span>
                                <span>•</span>
                                <span>
                                    Client Payout: <strong>{formatCurrency((data?.totalRevenue || 0) - (data?.estimatedOrgEarnings || 0))}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                    Total Transactions: <strong>{data?.count || 0}</strong>
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabbed Tables */}
            <div className="p-4 md:p-6 pt-0">
                <Tabs defaultValue={isAdmin ? "pending" : "transactions"} className="w-full">
                    <TabsList className={`grid w-full ${isAdmin ? 'max-w-2xl grid-cols-3' : 'max-w-md grid-cols-2'}`}>
                        {isAdmin && (
                            <TabsTrigger value="pending">
                                <IconLoader className="h-4 w-4 mr-2" />
                                Pending Approvals
                                {withdrawals.filter(w => w.approval_status === 'PENDING_APPROVAL').length > 0 && (
                                    <Badge variant="destructive" className="ml-2">
                                        {withdrawals.filter(w => w.approval_status === 'PENDING_APPROVAL').length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="transactions">
                            <IconReceipt className="h-4 w-4 mr-2" />
                            Transactions
                        </TabsTrigger>
                        <TabsTrigger value="withdrawals">
                            <IconWallet className="h-4 w-4 mr-2" />
                            Withdrawals
                        </TabsTrigger>
                    </TabsList>

                    {/* Pending Approvals Tab (Admin Only) */}
                    {isAdmin && (
                        <TabsContent value="pending" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg">Pending Withdrawal Approvals</CardTitle>
                                            <CardDescription>
                                                Review and approve member withdrawal requests
                                            </CardDescription>
                                        </div>
                                        {withdrawals.filter(w => w.approval_status === 'APPROVED').length > 0 && (
                                            <Button
                                                onClick={handleBatchDisburse}
                                                disabled={isProcessing || selectedWithdrawals.length === 0}
                                                className="gap-2"
                                            >
                                                {isProcessing ? (
                                                    <IconLoader className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <IconCash className="h-4 w-4" />
                                                )}
                                                Disburse Selected ({selectedWithdrawals.length})
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading && withdrawals.length === 0 ? (
                                        <div className="flex h-24 items-center justify-center">
                                            <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : withdrawals.filter(w => w.approval_status === 'PENDING_APPROVAL' || w.approval_status === 'APPROVED').length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-center">
                                            <IconWallet className="h-12 w-12 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">No pending approvals</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-md border">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        <th className="p-3 text-left">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedWithdrawals.length === withdrawals.filter(w => w.approval_status === 'APPROVED').length && withdrawals.filter(w => w.approval_status === 'APPROVED').length > 0}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedWithdrawals(withdrawals.filter(w => w.approval_status === 'APPROVED').map(w => w.id))
                                                                    } else {
                                                                        setSelectedWithdrawals([])
                                                                    }
                                                                }}
                                                                className="rounded"
                                                            />
                                                        </th>
                                                        <th className="p-3 text-left text-sm font-medium">Member</th>
                                                        <th className="p-3 text-left text-sm font-medium">Amount</th>
                                                        <th className="p-3 text-left text-sm font-medium">Bank</th>
                                                        <th className="p-3 text-left text-sm font-medium">Account</th>
                                                        <th className="p-3 text-left text-sm font-medium">Status</th>
                                                        <th className="p-3 text-left text-sm font-medium">Date</th>
                                                        <th className="p-3 text-left text-sm font-medium">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {withdrawals
                                                        .filter(w => w.approval_status === 'PENDING_APPROVAL' || w.approval_status === 'APPROVED')
                                                        .map((withdrawal) => (
                                                            <tr key={withdrawal.id} className="border-b last:border-0 hover:bg-muted/50">
                                                                <td className="p-3">
                                                                    {withdrawal.approval_status === 'APPROVED' && (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedWithdrawals.includes(withdrawal.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedWithdrawals([...selectedWithdrawals, withdrawal.id])
                                                                                } else {
                                                                                    setSelectedWithdrawals(selectedWithdrawals.filter(id => id !== withdrawal.id))
                                                                                }
                                                                            }}
                                                                            className="rounded"
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-sm font-mono text-xs">{withdrawal.user_id.slice(-8)}</td>
                                                                <td className="p-3 text-sm font-semibold">{formatCurrency(withdrawal.amount)}</td>
                                                                <td className="p-3 text-sm">
                                                                    {BANK_OPTIONS.find(b => b.code === withdrawal.bank_code)?.name || withdrawal.bank_code}
                                                                </td>
                                                                <td className="p-3 text-sm">
                                                                    <div>
                                                                        <p className="font-mono text-xs">{withdrawal.account_number}</p>
                                                                        <p className="text-xs text-muted-foreground">{withdrawal.account_holder_name}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <Badge
                                                                        variant={
                                                                            withdrawal.approval_status === 'APPROVED' ? 'default' :
                                                                                withdrawal.approval_status === 'PENDING_APPROVAL' ? 'secondary' :
                                                                                    'outline'
                                                                        }
                                                                    >
                                                                        {withdrawal.approval_status.replace('_', ' ')}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 text-sm text-muted-foreground">
                                                                    {new Date(withdrawal.created_at).toLocaleDateString('id-ID', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </td>
                                                                <td className="p-3">
                                                                    {withdrawal.approval_status === 'PENDING_APPROVAL' ? (
                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => handleApprove(withdrawal.id)}
                                                                                disabled={isProcessing}
                                                                                className="h-8"
                                                                            >
                                                                                Approve
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="destructive"
                                                                                onClick={() => {
                                                                                    setRejectingId(withdrawal.id)
                                                                                    setRejectDialogOpen(true)
                                                                                }}
                                                                                disabled={isProcessing}
                                                                                className="h-8"
                                                                            >
                                                                                Reject
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">Ready for disbursement</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {/* Transactions Tab */}
                    <TabsContent value="transactions" className="mt-4">
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
                    </TabsContent>

                    {/* Withdrawals Tab */}
                    <TabsContent value="withdrawals" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Withdrawal History</CardTitle>
                                <CardDescription>
                                    {isAdmin
                                        ? "All withdrawal requests from your organization"
                                        : "Your withdrawal transaction history"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading && withdrawals.length === 0 ? (
                                    <div className="flex h-24 items-center justify-center">
                                        <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : withdrawals.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-center">
                                        <IconWallet className="h-12 w-12 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">No withdrawals yet</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b bg-muted/50">
                                                    <th className="p-3 text-left text-sm font-medium">Reference ID</th>
                                                    <th className="p-3 text-left text-sm font-medium">Amount</th>
                                                    <th className="p-3 text-left text-sm font-medium">Bank</th>
                                                    <th className="p-3 text-left text-sm font-medium">Account</th>
                                                    <th className="p-3 text-left text-sm font-medium">Status</th>
                                                    <th className="p-3 text-left text-sm font-medium">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {withdrawals.map((withdrawal) => (
                                                    <tr key={withdrawal.id} className="border-b last:border-0 hover:bg-muted/50">
                                                        <td className="p-3 text-sm font-mono">{withdrawal.reference_id}</td>
                                                        <td className="p-3 text-sm font-semibold">{formatCurrency(withdrawal.amount)}</td>
                                                        <td className="p-3 text-sm">
                                                            {BANK_OPTIONS.find(b => b.code === withdrawal.bank_code)?.name || withdrawal.bank_code}
                                                        </td>
                                                        <td className="p-3 text-sm">
                                                            <div>
                                                                <p className="font-mono text-xs">{withdrawal.account_number}</p>
                                                                <p className="text-xs text-muted-foreground">{withdrawal.account_holder_name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            <Badge
                                                                variant={
                                                                    withdrawal.status === 'SUCCEEDED' ? 'default' :
                                                                        withdrawal.status === 'PENDING' || withdrawal.status === 'ACCEPTED' ? 'secondary' :
                                                                            withdrawal.status === 'FAILED' ? 'destructive' :
                                                                                'outline'
                                                                }
                                                            >
                                                                {withdrawal.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-sm text-muted-foreground">
                                                            {new Date(withdrawal.created_at).toLocaleDateString('id-ID', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Withdrawal Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this withdrawal. The amount will be refunded to the member's balance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                            <Input
                                id="rejection-reason"
                                placeholder="e.g., Insufficient documentation, Invalid account details"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectDialogOpen(false)
                                setRejectingId(null)
                                setRejectionReason("")
                            }}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isProcessing || !rejectionReason.trim()}
                        >
                            {isProcessing ? (
                                <>
                                    <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                "Confirm Rejection"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
