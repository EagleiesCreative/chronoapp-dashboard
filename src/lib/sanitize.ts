import DOMPurify from 'dompurify'

/**
 * Sanitize utility for preventing XSS attacks
 * Used to clean user-generated content before storage and display
 */

/**
 * Configuration for DOMPurify
 * - ALLOWED_TAGS: Only allow basic formatting
 * - ALLOWED_ATTR: Minimal allowed attributes
 */
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
}

/**
 * Strict sanitization - removes all HTML tags and returns plain text
 * Use this for subjects and short text fields
 */
export function sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return ''

    // For server-side, we need to strip HTML manually since DOMPurify requires a DOM
    // Use a simple regex to strip all HTML tags for text-only fields
    return input
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Extra protection against script tags
        .trim()
}

/**
 * HTML-aware sanitization - allows basic formatting but removes dangerous content
 * Use this for message bodies where some formatting might be acceptable
 */
export function sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') return ''

    // Server-side sanitization
    // Remove script tags and event handlers
    let clean = input
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Remove data: URLs that could be dangerous
        .replace(/data:\s*text\/html/gi, '')
        .trim()

    return clean
}

/**
 * Client-side sanitization using DOMPurify
 * Use this in client components for rendering user content
 */
export function sanitizeForDisplay(input: string): string {
    if (typeof window === 'undefined') {
        // Server-side fallback
        return sanitizeHtml(input)
    }

    if (!input || typeof input !== 'string') return ''

    return DOMPurify.sanitize(input, SANITIZE_CONFIG)
}

/**
 * Escape HTML entities for safe text display
 * Use this when you want to display text exactly as entered (no HTML interpretation)
 */
export function escapeHtml(input: string): string {
    if (!input || typeof input !== 'string') return ''

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
}
