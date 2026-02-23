/**
 * Sample data for the Chronosnap Dashboard UI
 * All mock data is centralized here for clean component code.
 */

// ── Stat Cards ──
export interface StatCardItem {
    label: string
    value: string
}

export const statCards: StatCardItem[] = [
    { label: "Total Revenue this month", value: "$21,219.24" },
    { label: "Total Saving", value: "$14,376.26" },
    { label: "Taxes to be paid", value: "$4,667.02" },
]

// ── Spending Segments ──
export interface SpendingSegment {
    label: string
    percentage: number
    colorClass: string
}

export const spendingSegments: SpendingSegment[] = [
    { label: "Shopping", percentage: 27, colorClass: "bg-primary-400" },
    { label: "Subscriptions", percentage: 35, colorClass: "bg-secondary-400" },
    { label: "Dining Out", percentage: 18, colorClass: "bg-info" },
    { label: "Other", percentage: 20, colorClass: "bg-gray-600" },
]

export const spendingTotal = "$4,815.23"

// ── Credit Card ──
export const creditCard = {
    number: "3455 4562 7710 3507",
    holder: "John Carter",
    expiry: "02/30",
}

// ── Balance Chart ──
export interface BalanceDataPoint {
    month: string
    value: number
    highlighted: boolean
}

export const balanceData: BalanceDataPoint[] = [
    { month: "Jan", value: 280000, highlighted: false },
    { month: "Feb", value: 310000, highlighted: false },
    { month: "Mar", value: 350000, highlighted: false },
    { month: "Apr", value: 400000, highlighted: false },
    { month: "May", value: 543000, highlighted: true },
    { month: "Jun", value: 290000, highlighted: false },
    { month: "Jul", value: 260000, highlighted: false },
    { month: "Aug", value: 300000, highlighted: false },
    { month: "Sep", value: 320000, highlighted: false },
]

export const availableBalance = "$102,175.96"

// ── Transaction Table ──
export type PaymentMethod = "Wire Transfer" | "Bank Transfer"
export type TransactionStatus = "Received" | "Failed" | "Processed"

export interface Transaction {
    id: string
    paymentId: string
    totalAmount: string
    to: string
    avatar: string
    paymentPeriod: string
    paymentMethod: PaymentMethod
    processedDate: string
    status: TransactionStatus
}

export const transactions: Transaction[] = [
    {
        id: "1",
        paymentId: "PAY-12345XYZ",
        totalAmount: "$1,164.99 USD",
        to: "Kathryn Murphy",
        avatar: "KM",
        paymentPeriod: "Mar 10 - Mar 15",
        paymentMethod: "Wire Transfer",
        processedDate: "Mar 13",
        status: "Received",
    },
    {
        id: "2",
        paymentId: "TXN-98765A9",
        totalAmount: "$1,072.98 USD",
        to: "Guy Hawkins",
        avatar: "GH",
        paymentPeriod: "Mar 11 - Mar 12",
        paymentMethod: "Bank Transfer",
        processedDate: "Mar 11",
        status: "Failed",
    },
    {
        id: "3",
        paymentId: "INV-56789LMN",
        totalAmount: "$977.98 USD",
        to: "Wade Warren",
        avatar: "WW",
        paymentPeriod: "Mar 4 - Mar 8",
        paymentMethod: "Wire Transfer",
        processedDate: "Mar 7",
        status: "Processed",
    },
    {
        id: "4",
        paymentId: "ORD-99887PQR",
        totalAmount: "$535.98 USD",
        to: "Annette Black",
        avatar: "AB",
        paymentPeriod: "Feb 1 - Feb 15",
        paymentMethod: "Bank Transfer",
        processedDate: "Feb 12",
        status: "Received",
    },
    {
        id: "5",
        paymentId: "PAY-44321UVW",
        totalAmount: "$2,340.00 USD",
        to: "Leslie Alexander",
        avatar: "LA",
        paymentPeriod: "Feb 20 - Feb 28",
        paymentMethod: "Wire Transfer",
        processedDate: "Feb 25",
        status: "Received",
    },
    {
        id: "6",
        paymentId: "TXN-77654DEF",
        totalAmount: "$890.50 USD",
        to: "Robert Fox",
        avatar: "RF",
        paymentPeriod: "Jan 15 - Jan 20",
        paymentMethod: "Bank Transfer",
        processedDate: "Jan 18",
        status: "Processed",
    },
    {
        id: "7",
        paymentId: "INV-33210GHI",
        totalAmount: "$1,500.00 USD",
        to: "Jenny Wilson",
        avatar: "JW",
        paymentPeriod: "Jan 5 - Jan 10",
        paymentMethod: "Wire Transfer",
        processedDate: "Jan 8",
        status: "Failed",
    },
    {
        id: "8",
        paymentId: "ORD-88432JKL",
        totalAmount: "$715.25 USD",
        to: "Devon Lane",
        avatar: "DL",
        paymentPeriod: "Dec 20 - Dec 30",
        paymentMethod: "Bank Transfer",
        processedDate: "Dec 28",
        status: "Received",
    },
]

export const totalEntries = 50
export const entriesPerPage = 8
