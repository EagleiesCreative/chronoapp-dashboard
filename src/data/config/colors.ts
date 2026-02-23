/**
 * Chronosnap Design Tokens — JS-importable color palette
 * Mirrors CSS custom properties for use in Recharts, inline styles, etc.
 */

export const primary = {
    50: "#e0fbec",
    100: "#b3f5cf",
    200: "#80eeb0",
    300: "#4de791",
    400: "#26e27a",
    500: "#00dd63",
    600: "#00c958",
    700: "#00a446",
    800: "#008136",
    900: "#006028",
    950: "#00421a",
    DEFAULT: "#00dd63",
} as const

export const secondary = {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
    950: "#1e1b4b",
    DEFAULT: "#6366f1",
} as const

export const gray = {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
} as const

export const accents = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
    purple: "#8b5cf6",
    cardGold: "#c9a84c",
    cardDark: "#2a2a2a",
    chartBarMuted: "rgba(0,221,99,0.25)", // matching new primary
} as const

export const gradients = {
    creditCard: "linear-gradient(135deg, #2a2a2a 0%, #3d3c2a 50%, #4a4528 100%)",
    upgradeCtaBg:
        "linear-gradient(180deg, rgba(0,221,99,0.12) 0%, transparent 100%)",
} as const
