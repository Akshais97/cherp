import { z } from 'zod'

const optionalDate = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()),
      { message: 'Enter a valid due date.' },
    ),
)

const optionalAssignee = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z.string().uuid().optional(),
)

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, 'Task title is required.'),
  description: z.string().trim().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  due_date: optionalDate,
  assigned_to: optionalAssignee,
})

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2, 'Task title is required.'),
  description: z.string().trim().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  due_date: optionalDate,
})

export type CreateTaskInput = z.input<typeof createTaskSchema>
export type CreateTaskValues = z.output<typeof createTaskSchema>
export type UpdateTaskInput = z.input<typeof updateTaskSchema>
export type UpdateTaskValues = z.output<typeof updateTaskSchema>
