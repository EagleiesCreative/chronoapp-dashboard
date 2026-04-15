import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deduplicatePayments<T extends { xendit_invoice_id?: string, status?: string, id?: string, updated_at?: string }>(payments: T[]): T[] {
    const uniqueMap = new Map<string, T>()

    for (const payment of payments) {
        // Fallback to id if xendit_invoice_id is missing to ensure we don't accidentally merge unrelated records
        const key = payment.xendit_invoice_id || payment.id
        if (!key) continue

        const existing = uniqueMap.get(key)
        
        if (!existing) {
            uniqueMap.set(key, payment)
            continue
        }

        const existStatus = existing.status?.toUpperCase() || 'PENDING'
        const newStatus = payment.status?.toUpperCase() || 'PENDING'
        
        const isExistPaid = existStatus === 'PAID' || existStatus === 'SETTLED'
        const isNewPaid = newStatus === 'PAID' || newStatus === 'SETTLED'

        if (!isExistPaid && isNewPaid) {
            uniqueMap.set(key, payment)
        } else if (existStatus === 'PENDING' && newStatus === 'EXPIRED') {
            uniqueMap.set(key, payment)
        } else if (existStatus === newStatus && payment.updated_at && existing.updated_at) {
            // If same status, keep the latest one
            if (new Date(payment.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
                uniqueMap.set(key, payment)
            }
        }
    }

    return Array.from(uniqueMap.values())
}
