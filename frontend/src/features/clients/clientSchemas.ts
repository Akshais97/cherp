import { z } from 'zod'

const optionalNumber = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().min(0).optional(),
)

const positiveInteger = z.preprocess(
  (value) => Number(value),
  z.number().int().positive(),
)

export const clientOnboardingSchema = z.object({
  name: z.string().trim().min(2, 'Client name is required.'),
  contact_name: z.string().trim().optional(),
  contact_email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Enter a valid email address.',
    }),
  contact_phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  monthly_retainer: optionalNumber,
  currency: z.string().trim().min(3, 'Currency is required.'),
  contract_duration: positiveInteger,
  contract_start: z
    .string()
    .min(1, 'Contract start is required.')
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
      message: 'Enter a valid contract start date.',
    }),
  payment_terms: z.string().trim().optional(),
  renewal_date: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z
      .string()
      .optional()
      .refine((value) => !value || !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
        message: 'Enter a valid renewal date.',
      }),
  ),
  notes: z.string().trim().optional(),
  retainer_hours: optionalNumber,
  scope_template_id: z.string().uuid('Select a scope template.'),
  team_assignments: z.record(z.string(), z.array(z.string())).optional(),
})

export const clientEditSchema = clientOnboardingSchema
  .omit({ scope_template_id: true })
  .extend({
    industry: z.string().trim().min(1, 'Industry is required.'),
    service_type: z.string().trim().min(1, 'Service type is required.'),
  })

export type ClientOnboardingInput = z.input<typeof clientOnboardingSchema>
export type ClientOnboardingValues = z.output<typeof clientOnboardingSchema>
export type ClientEditInput = z.input<typeof clientEditSchema>
export type ClientEditValues = z.output<typeof clientEditSchema>
