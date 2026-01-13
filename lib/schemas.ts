import { z } from 'zod'

// ============================================================================
// BOTTLE BLOCK SCHEMAS
// ============================================================================

export const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1, 'Text content cannot be empty'),
})

export const imageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string().min(1, 'Image URL is required'), // Accept both full URLs and paths like /api/images/[id]
  caption: z.string().optional(),
})

export const videoBlockSchema = z.object({
  type: z.literal('video'),
  url: z.string().min(1, 'Video URL is required'), // Accept both full URLs and paths
  caption: z.string().optional(),
})

export const voiceBlockSchema = z.object({
  type: z.literal('voice'),
  url: z.string().min(1, 'Voice URL is required'), // Accept both full URLs and paths
  duration: z.number().positive().optional(),
})

// Discriminated union for type-safe bottle blocks
export const bottleBlockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  voiceBlockSchema,
])

export const bottleContentSchema = z.object({
  blocks: z.array(bottleBlockSchema).min(1, 'At least one block is required'),
})

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const setupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// ============================================================================
// BOTTLE API SCHEMAS
// ============================================================================

export const createBottleSchema = z.object({
  name: z.string().min(1, 'Bottle name is required'),
  content: bottleContentSchema,
  description: z.string().optional(),
  assignedViewerId: z.number().int().positive('Invalid assigned viewer ID'),
})

export const openBottleSchema = z.object({
  bottleId: z.number().int().positive('Invalid bottle ID'),
  entry: z.string().min(1, 'Journal entry is required'),
})

export const bottleIdParamSchema = z.object({
  id: z.string().transform((val, ctx) => {
    const parsed = Number.parseInt(val, 10)
    if (Number.isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid bottle ID',
      })
      return z.NEVER
    }
    return parsed
  }),
})

// ============================================================================
// JOURNAL SCHEMAS
// ============================================================================

export const createJournalSchema = z.object({
  entry: z.string().min(1, 'Journal entry is required'),
  date: z.coerce.date().optional(),
})

export const updateJournalSchema = z.object({
  entry: z.string().min(1, 'Journal entry is required'),
})

export const journalIdQuerySchema = z.object({
  id: z.string().transform((val, ctx) => {
    const parsed = Number.parseInt(val, 10)
    if (Number.isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid journal ID',
      })
      return z.NEVER
    }
    return parsed
  }),
})

export const submitJournalSchema = z.object({
  entry: z.string().min(1, 'Journal entry is required'),
})

// ============================================================================
// UPLOAD SCHEMAS
// ============================================================================

export const uploadFileSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 10 * 1024 * 1024, // 10MB
    'File size must be less than 10MB'
  ).refine(
    (file) => file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/'),
    'File must be an image, video, or audio file'
  ),
})

// ============================================================================
// TYPE EXPORTS (inferred from schemas for type safety)
// ============================================================================

export type TextBlock = z.infer<typeof textBlockSchema>
export type ImageBlock = z.infer<typeof imageBlockSchema>
export type VideoBlock = z.infer<typeof videoBlockSchema>
export type VoiceBlock = z.infer<typeof voiceBlockSchema>
export type BottleBlock = z.infer<typeof bottleBlockSchema>
export type BottleContent = z.infer<typeof bottleContentSchema>

export type LoginInput = z.infer<typeof loginSchema>
export type SetupInput = z.infer<typeof setupSchema>
export type CreateBottleInput = z.infer<typeof createBottleSchema>
export type OpenBottleInput = z.infer<typeof openBottleSchema>
export type CreateJournalInput = z.infer<typeof createJournalSchema>
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>
export type SubmitJournalInput = z.infer<typeof submitJournalSchema>
