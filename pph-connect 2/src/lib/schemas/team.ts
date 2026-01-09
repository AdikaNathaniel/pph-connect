import * as z from 'zod'

// Note: teams table does NOT have leader_id column - team leaders would need
// to be tracked via a separate team_members table with a role field
export const teamSchema = z.object({
  team_name: z.string().min(3, 'Team name must be at least 3 characters'),
  department_id: z.string().uuid('Please select a department'),
  locale_primary: z.string().min(1, 'Please select a primary locale'),
  locale_secondary: z.string().optional().or(z.literal('')),
  locale_region: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
})

export type TeamFormData = z.infer<typeof teamSchema>
