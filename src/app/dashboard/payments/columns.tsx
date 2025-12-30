"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { IconCreditCard, IconArrowUp, IconArrowDown, IconArrowsSort } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

export type Payment = {
    id: string
    xendit_id: string
    amount: number
    status: string
    payment_method: string
    created_at: string
}

export const columns: ColumnDef<Payment>[] = [
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <Badge variant={status === 'PAID' || status === 'SETTLED' ? 'default' : 'secondary'} className="rounded-md">
                    {status}
                </Badge>
            )
        },
    },
    {
        accessorKey: "xendit_id",
        header: "Transaction ID",
        cell: ({ row }) => {
            return (
                <div className="font-medium truncate max-w-[200px]" title={row.getValue("xendit_id")}>
                    {row.getValue("xendit_id")}
                </div>
            )
        },
    },
    {
        accessorKey: "amount",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hover:bg-transparent px-0"
                >
                    Amount
                    {column.getIsSorted() === "asc" ? (
                        <IconArrowUp className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                        <IconArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
                    )}
                </Button>
            )
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))
            const formatted = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
            }).format(amount)

            return <div className="font-medium">{formatted}</div>
        },
    },
    {
        accessorKey: "payment_method",
        header: "Method",
        cell: ({ row }) => {
            const method = row.getValue("payment_method") as string
            return (
                <div className="flex items-center gap-2">
                    <IconCreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{method.replace(/_/g, ' ').toLowerCase()}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "created_at",
        header: ({ column }) => {
            return (
                <div className="text-right">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent px-0"
                    >
                        Date
                        {column.getIsSorted() === "asc" ? (
                            <IconArrowUp className="ml-2 h-4 w-4" />
                        ) : column.getIsSorted() === "desc" ? (
                            <IconArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                            <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
                        )}
                    </Button>
                </div>
            )
        },
        cell: ({ row }) => {
            const date = new Date(row.getValue("created_at"))
            return (
                <div className="text-right">
                    {date.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            )
        },
    },
]
