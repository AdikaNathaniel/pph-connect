import * as z from 'zod'

export const departmentSchema = z.object({
  department_name: z.string().min(3, 'Department name must be at least 3 characters'),
  description: z.string().optional().or(z.literal('')),
})

export type DepartmentFormData = z.infer<typeof departmentSchema>
