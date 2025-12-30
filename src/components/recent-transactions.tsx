"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { IconArrowRight, IconLoader } from "@tabler/icons-react"

interface Transaction {
    id: string
    external_id: string
    amount: number
    status: string
    created: string
    payment_method: string
}

export function RecentTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/dashboard/stats')
            const data = await res.json()
            if (data.recentTransactions) {
                setTransactions(data.recentTransactions)
            }
        } catch (error) {
            console.error('Failed to fetch recent transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('id-ID', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            'PAID': 'bg-green-500/10 text-green-700 dark:text-green-400',
            'SETTLED': 'bg-green-500/10 text-green-700 dark:text-green-400',
            'PENDING': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
            'EXPIRED': 'bg-red-500/10 text-red-700 dark:text-red-400',
        }

        return (
            <Badge variant="outline" className={statusColors[status] || ''}>
                {status}
            </Badge>
        )
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Latest payment activity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <IconLoader className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (transactions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Latest payment activity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                        No transactions yet
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Latest payment activity</CardDescription>
                </div>
                <Link href="/dashboard/payments">
                    <Button variant="ghost" size="sm">
                        View all
                        <IconArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {transactions.map((transaction) => (
                        <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium truncate">
                                        {transaction.external_id}
                                    </p>
                                    {getStatusBadge(transaction.status)}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatDate(transaction.created)}</span>
                                    <span>•</span>
                                    <span>{transaction.payment_method}</span>
                                </div>
                            </div>
                            <div className="text-right ml-4">
                                <p className="text-sm font-semibold">
                                    {formatCurrency(transaction.amount)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
