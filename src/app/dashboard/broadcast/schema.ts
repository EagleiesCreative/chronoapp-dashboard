import { z } from "zod"

// Maximum length constants
const MAX_SUBJECT_LENGTH = 100
const MAX_MESSAGE_LENGTH = 2000

export const broadcastSchema = z.object({
    subject: z
        .string()
        .min(1, "Subject is required")
        .max(MAX_SUBJECT_LENGTH, `Subject must be less than ${MAX_SUBJECT_LENGTH} characters`)
        .transform((val) => val.trim()),
    message: z
        .string()
        .min(1, "Message is required")
        .max(MAX_MESSAGE_LENGTH, `Message must be less than ${MAX_MESSAGE_LENGTH} characters`)
        .transform((val) => val.trim()),
    priority: z.enum(["low", "medium", "high"]),
})

export type BroadcastFormValues = z.infer<typeof broadcastSchema>

// Export constants for use in UI
export const LIMITS = {
    MAX_SUBJECT_LENGTH,
    MAX_MESSAGE_LENGTH,
} as const
