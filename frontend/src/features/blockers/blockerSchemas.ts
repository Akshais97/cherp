import { z } from 'zod'

export const createBlockerSchema = z.object({
  title: z.string().trim().min(2, 'Blocker title is required.'),
  description: z.string().trim().min(2, 'Description is required.'),
  severity: z.enum(['high', 'medium', 'low']).default('medium'),
  impact: z.string().trim().optional(),
})

export const resolveBlockerSchema = z.object({
  resolution_notes: z.string().trim().min(2, 'Resolution notes are required.'),
})

export type CreateBlockerInput = z.input<typeof createBlockerSchema>
export type CreateBlockerValues = z.output<typeof createBlockerSchema>
export type ResolveBlockerInput = z.input<typeof resolveBlockerSchema>
export type ResolveBlockerValues = z.output<typeof resolveBlockerSchema>
