import * as z from 'zod'

export const projectSchema = z.object({
  project_code: z
    .string()
    .min(3, 'Project code must be at least 3 characters')
    .max(20, 'Project code must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Project code can only contain letters, numbers, hyphens, and underscores'),
  project_name: z.string().min(5, 'Project name must be at least 5 characters'),
  department_id: z.string().uuid('Please select a department'),
  expert_tier: z.enum(['tier0', 'tier1', 'tier2']),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).default('active'),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
})

export type ProjectFormData = z.infer<typeof projectSchema>
