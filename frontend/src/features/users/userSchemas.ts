import { z } from 'zod'

export const roleValues = [
  'super_admin',
  'project_manager',
  'team_member',
  'client',
] as const

export const createUserSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  full_name: z.string().min(2, 'Full name is required.'),
  role: z.enum(roleValues),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must include one uppercase letter.')
    .regex(/[0-9]/, 'Password must include one number.'),
})

export type CreateUserInput = z.input<typeof createUserSchema>
export type CreateUserValues = z.output<typeof createUserSchema>

