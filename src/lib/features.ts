import { supabase } from './supabase-server'
import { PLANS, ADDONS, PlanId, AddonId } from './pricing'

export const FEATURES = {
    VOUCHERS: 'vouchers',
    MULTIPRINT: 'multiprint',
    PAPER_TRACKING: 'paper_tracking',
    PRIORITY_SUPPORT: 'priority_support',
    CUSTOM_BRANDING: 'custom_branding',
    ADVANCED_ANALYTICS: 'advanced_analytics',
    GIF: 'gif',
    FILTERS: 'filters',
    LIVE_VIDEO: 'live_video',
} as const

export type Feature = typeof FEATURES[keyof typeof FEATURES]

interface BoothSubscription {
    id: string
    name: string
    subscription_plan: string
    subscription_status: string
    subscription_expires_at: string | null
    addons: string[]
}

/**
 * Get a specific booth's subscription details
 */
export async function getBoothSubscription(boothId: string, orgId: string): Promise<BoothSubscription | null> {
    try {
        const { data, error } = await supabase
            .from('booths')
            .select('id, name, subscription_plan, subscription_status, subscription_expires_at, addons')
            .eq('id', boothId)
            .eq('organization_id', orgId)
            .single()

        if (error || !data) {
            console.error('Error fetching booth subscription:', error)
            return null
        }

        return data
    } catch (error) {
        console.error('Error in getBoothSubscription:', error)
        return null
    }
}

/**
 * Check if a booth has access to a specific feature based on its plan and addons
 */
export async function hasBoothFeature(boothId: string, orgId: string, feature: Feature): Promise<boolean> {
    try {
        const subscription = await getBoothSubscription(boothId, orgId)
        if (!subscription) return false

        // ── Expiry check: runs FIRST regardless of status string ───────────────
        // Fixes the bug where status='active' + expires_at in the past still
        // granted full feature access. The cron runs nightly, but during the day
        // we must check expiry here too to close the window.
        if (subscription.subscription_expires_at) {
            const expiresAt = new Date(subscription.subscription_expires_at)
            if (expiresAt < new Date()) {
                // Expired — fall back to growth features no matter what status says
                const growthFeatures = PLANS['growth'].features
                return Boolean(growthFeatures[feature as keyof typeof growthFeatures])
            }
        }

        // ── Status check ────────────────────────────────────────────────────────
        if (subscription.subscription_status === 'expired') {
            // Already downgraded by cron — growth only
            const growthFeatures = PLANS['growth'].features
            return Boolean(growthFeatures[feature as keyof typeof growthFeatures])
        }

        if (subscription.subscription_status !== 'active' && subscription.subscription_status !== 'cancelled') {
            // Suspended, payment_pending, etc. — no premium features
            return false
        }
        // ───────────────────────────────────────────────────────────────────────

        // Feature mapping based on pricing plans
        const plan = PLANS[(subscription.subscription_plan as PlanId) || 'growth']

        switch (feature) {
            case FEATURES.VOUCHERS:
                return subscription.addons?.includes('voucher-system') || plan.id !== 'growth'
            case FEATURES.ADVANCED_ANALYTICS:
                return plan.features.advanced_analytics === true
            case FEATURES.CUSTOM_BRANDING:
                return plan.features.white_label === true
            case FEATURES.GIF:
                return plan.features.gif_mode === true
            case FEATURES.PRIORITY_SUPPORT:
                return plan.features.priority_support === true
            case FEATURES.FILTERS:
                return subscription.addons?.includes('custom-filter') || plan.id !== 'growth'
            case FEATURES.LIVE_VIDEO:
                return subscription.addons?.includes('live-mode-streaming') || false
            case FEATURES.MULTIPRINT:
            case FEATURES.PAPER_TRACKING:
                return true
            default:
                return false
        }
    } catch (error) {
        console.error('Error checking booth feature:', error)
        return false
    }
}

/**
 * Check if organization can create a new booth
 * (Organizations can always create booths, but by default they start as "Growth")
 */
export async function canCreateBooth(orgId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    try {
        // Since pricing is now per-booth, there is virtually no limit to how many booths they can create.
        // However, if we still want an org-wide limit, we can fetch it, otherwise allow unlimited.
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('max_booths')
            .eq('id', orgId)
            .single()

        const max_booths = org?.max_booths || 9999 // Unlimited effectively

        const { count, error: countError } = await supabase
            .from('booths')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        if (countError) {
            console.error('Error counting booths:', countError)
            return { allowed: false, current: 0, max: max_booths }
        }

        const current = count || 0
        const allowed = current < max_booths

        return { allowed, current, max: max_booths }
    } catch (error) {
        console.error('Error in canCreateBooth:', error)
        return { allowed: false, current: 0, max: 0 }
    }
}

/**
 * Check if a booth's subscription is active
 */
export async function isBoothSubscriptionActive(boothId: string, orgId: string): Promise<boolean> {
    try {
        const subscription = await getBoothSubscription(boothId, orgId)
        if (!subscription) return false

        // Basic/Growth plan is always active automatically
        if (subscription.subscription_plan === 'growth') return true

        if (subscription.subscription_status === 'active') {
            // Check expiry just in case
            if (subscription.subscription_expires_at) {
                const expiresAt = new Date(subscription.subscription_expires_at)
                if (expiresAt < new Date()) {
                    // Update to expired... (In a real app, you'd do this via cron/webhook)
                    return false
                }
            }
            return true
        }

        if (subscription.subscription_status === 'cancelled') {
            if (!subscription.subscription_expires_at) return false
            const expiresAt = new Date(subscription.subscription_expires_at)
            return expiresAt >= new Date()
        }

        return false
    } catch (error) {
        console.error('Error checking booth subscription status:', error)
        return false
    }
}
