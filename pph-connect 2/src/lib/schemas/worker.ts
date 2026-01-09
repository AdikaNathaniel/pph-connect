import * as z from 'zod'

// Note: Workers don't have direct team_id - teams are assigned indirectly through:
// workers → worker_assignments → workforce_projects → project_teams → teams
export const workerSchema = z.object({
  hr_id: z.string().min(1, 'HR ID is required'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  engagement_model: z.enum(['core', 'upwork', 'external', 'internal']),
  worker_role: z.string().optional(),
  email_personal: z.string().email('Invalid email address'),
  email_pph: z.string().email('Invalid email address').optional().or(z.literal('')),
  country_residence: z.string().min(2, 'Country is required'),
  locale_primary: z.string().min(2, 'Primary locale is required'),
  locale_all: z.array(z.string()).default([]),
  hire_date: z.string().min(1, 'Hire date is required'),
  rtw_datetime: z.string().optional().or(z.literal('')),
  supervisor_id: z.string().uuid().optional().or(z.literal('')),
  termination_date: z.string().optional().or(z.literal('')),
  bgc_expiration_date: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'active', 'inactive', 'terminated']).default('pending'),
})

export type WorkerFormData = z.infer<typeof workerSchema>
