import { z } from 'zod'

// UUID regex that accepts standard UUID format (8-4-4-4-12 hex characters)
// More permissive than RFC 4122 strict validation to match database seed data
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Schema for validating work stats CSV row data
 *
 * Expected CSV columns:
 * - worker_id: UUID of the worker
 * - worker_account_id: UUID of the worker account (optional)
 * - project_id: UUID of the project
 * - work_date: Date in YYYY-MM-DD format
 * - units_completed: Number of units completed (optional)
 * - hours_worked: Decimal number of hours (optional)
 * - earnings: Decimal earnings amount (optional)
 */
export const workStatRowSchema = z.object({
  worker_id: z.string().regex(uuidRegex, 'Invalid worker ID format (use UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'),
  worker_account_id: z.string().regex(uuidRegex, 'Invalid worker account ID format').optional().nullable(),
  project_id: z.string().regex(uuidRegex, 'Invalid project ID format (use UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  units_completed: z.coerce.number().int().nonnegative('Units must be non-negative').optional().nullable(),
  hours_worked: z.coerce.number().positive('Hours must be positive').max(24, 'Hours cannot exceed 24').optional().nullable(),
  earnings: z.coerce.number().nonnegative('Earnings must be non-negative').optional().nullable(),
})

export type WorkStatRow = z.infer<typeof workStatRowSchema>

/**
 * Schema for work stats with additional metadata after validation
 */
export const workStatSchema = workStatRowSchema.extend({
  id: z.string().uuid().optional(),
  created_at: z.string().optional(),
  created_by: z.string().uuid().optional().nullable(),
  updated_at: z.string().optional(),
  updated_by: z.string().uuid().optional().nullable(),
})

export type WorkStat = z.infer<typeof workStatSchema>

/**
 * Validation error type for CSV import
 */
export interface WorkStatValidationError {
  row: number
  field?: string
  message: string
  data?: WorkStatRow
}

/**
 * Import result summary
 */
export interface WorkStatsImportResult {
  totalRows: number
  successCount: number
  errorCount: number
  errors: WorkStatValidationError[]
  duplicateCount: number
  validRows: WorkStatRow[]
}
