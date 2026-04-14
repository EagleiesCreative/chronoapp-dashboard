export const PLANS = {
    growth: {
        id: 'growth',
        name: 'Growth',
        price: 0,
        currency: 'IDR',
        interval: 'month',
        features: {
            unlimited_events: false,
            premium_templates: false,
            ai_background: false,
            gif_mode: false,
            advanced_analytics: false,
            white_label: false,
            api_access: false,
            priority_support: false,
        }
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        price: 490000, // Estimation, you can adjust this value
        currency: 'IDR',
        interval: 'month',
        features: {
            unlimited_events: true,
            premium_templates: true,
            ai_background: true,
            gif_mode: true,
            advanced_analytics: true,
            white_label: false,
            api_access: false,
            priority_support: false,
        }
    },
    'panoramic-plus': {
        id: 'panoramic-plus',
        name: 'Panoramic Plus',
        price: 990000, // Estimation, you can adjust this value
        currency: 'IDR',
        interval: 'month',
        features: {
            unlimited_events: true,
            premium_templates: true,
            ai_background: true,
            gif_mode: true,
            advanced_analytics: true,
            white_label: true,
            api_access: true,
            priority_support: true,
        }
    }
} as const;

export const ADDONS = {
    'voucher-system': {
        id: 'voucher-system',
        name: 'Voucher System',
        description: 'Generate promotional vouchers and easily validate them at your booth events.',
        price: 150000, // One-time, estimation
        currency: 'IDR',
        interval: 'one-time',
    },
    'live-mode-streaming': {
        id: 'live-mode-streaming',
        name: 'Live Mode Streaming',
        description: 'Stream the photobooth gallery directly to an external screen or monitor over the network.',
        price: 250000, // One-time, estimation
        currency: 'IDR',
        interval: 'one-time',
    },
    'multiangle-view': {
        id: 'multiangle-view',
        name: 'Multiangle View',
        description: 'Capture from multiple synchronized cameras simultaneously to create stunning spatial assets.',
        price: 350000, // One-time, estimation
        currency: 'IDR',
        interval: 'one-time',
    },
    'custom-filter': {
        id: 'custom-filter',
        name: 'Custom Filters',
        description: 'Allow users to apply premium filters and custom LUTs to their photos.',
        price: 150000,
        currency: 'IDR',
        interval: 'one-time',
    }
} as const;

export type PlanId = keyof typeof PLANS;
export type AddonId = keyof typeof ADDONS;
