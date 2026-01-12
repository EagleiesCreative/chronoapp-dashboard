import { supabase } from './supabase-server'

export const FEATURES = {
    VOUCHERS: 'vouchers',
    MULTIPRINT: 'multiprint',
    PAPER_TRACKING: 'paper_tracking',
    PRIORITY_SUPPORT: 'priority_support',
    CUSTOM_BRANDING: 'custom_branding',
    ADVANCED_ANALYTICS: 'advanced_analytics',
} as const

export type Feature = typeof FEATURES[keyof typeof FEATURES]

interface SubscriptionPlan {
    id: string
    name: string
    price: number
    currency: string
    max_booths: number
    features: Record<string, boolean>
}

interface OrganizationSubscription {
    subscription_plan: string
    subscription_status: string
    subscription_expires_at: string | null
    max_booths: number
}

// Cache for plan data (5 minutes TTL)
const planCache = new Map<string, { data: SubscriptionPlan; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get organization's current subscription plan
 */
export async function getOrgPlan(orgId: string): Promise<SubscriptionPlan | null> {
    try {
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('subscription_plan')
            .eq('id', orgId)
            .single()

        if (orgError || !org) {
            console.error('Error fetching organization:', orgError)
            return null
        }

        const planId = org.subscription_plan || 'basic'

        // Check cache first
        const cached = planCache.get(planId)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data
        }

        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single()

        if (planError || !plan) {
            console.error('Error fetching plan:', planError)
            return null
        }

        // Update cache
        planCache.set(planId, { data: plan, timestamp: Date.now() })

        return plan
    } catch (error) {
        console.error('Error in getOrgPlan:', error)
        return null
    }
}

/**
 * Check if organization has access to a specific feature
 */
export async function hasFeature(orgId: string, feature: Feature): Promise<boolean> {
    try {
        const plan = await getOrgPlan(orgId)
        if (!plan) return false

        return plan.features[feature] === true
    } catch (error) {
        console.error('Error checking feature:', error)
        return false
    }
}

/**
 * Check if organization can create a new booth
 */
export async function canCreateBooth(orgId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    try {
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('max_booths')
            .eq('id', orgId)
            .single()

        if (orgError || !org) {
            return { allowed: false, current: 0, max: 0 }
        }

        const { count, error: countError } = await supabase
            .from('booths')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        if (countError) {
            console.error('Error counting booths:', countError)
            return { allowed: false, current: 0, max: org.max_booths }
        }

        const current = count || 0
        const allowed = current < org.max_booths

        return { allowed, current, max: org.max_booths }
    } catch (error) {
        console.error('Error in canCreateBooth:', error)
        return { allowed: false, current: 0, max: 0 }
    }
}

/**
 * Get organization's subscription details
 */
export async function getOrgSubscription(orgId: string): Promise<OrganizationSubscription | null> {
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('subscription_plan, subscription_status, subscription_expires_at, max_booths')
            .eq('id', orgId)
            .single()

        if (error || !data) {
            console.error('Error fetching subscription:', error)
            return null
        }

        return data
    } catch (error) {
        console.error('Error in getOrgSubscription:', error)
        return null
    }
}

/**
 * Check if subscription is active and not expired
 */
export async function isSubscriptionActive(orgId: string): Promise<boolean> {
    try {
        const subscription = await getOrgSubscription(orgId)
        if (!subscription) return false

        // Basic plan is always active
        if (subscription.subscription_plan === 'basic') return true

        // Check status
        if (subscription.subscription_status !== 'active') return false

        // Check expiration
        if (subscription.subscription_expires_at) {
            const expiresAt = new Date(subscription.subscription_expires_at)
            if (expiresAt < new Date()) return false
        }

        return true
    } catch (error) {
        console.error('Error checking subscription status:', error)
        return false
    }
}

/**
 * Get all available plans
 */
export async function getAllPlans(): Promise<SubscriptionPlan[]> {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('price', { ascending: true })

        if (error || !data) {
            console.error('Error fetching plans:', error)
            return []
        }

        return data
    } catch (error) {
        console.error('Error in getAllPlans:', error)
        return []
    }
}
