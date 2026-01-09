import { z } from 'zod'

// UUID regex that accepts standard UUID format (8-4-4-4-12 hex characters)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Schema for validating work stats CSV row data (user-friendly format)
 *
 * Expected CSV columns:
 * - worker_account_email: Email of the worker account (e.g., john.doe@pph.com)
 * - project_code: Project code (e.g., VA-ENG-2024)
 * - work_date: Date in YYYY-MM-DD format
 * - units_completed: Number of units completed (optional)
 * - hours_worked: Decimal number of hours (optional)
 * - earnings: Decimal earnings amount (optional)
 */
export const workStatCsvRowSchema = z.object({
  worker_account_email: z.string().email('Invalid email format'),
  project_code: z.string().min(1, 'Project code is required'),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  units_completed: z.coerce.number().int().nonnegative('Units must be non-negative').optional().nullable(),
  hours_worked: z.coerce.number().nonnegative('Hours must be non-negative').max(24, 'Hours cannot exceed 24').optional().nullable(),
  earnings: z.coerce.number().nonnegative('Earnings must be non-negative').optional().nullable(),
})

export type WorkStatCsvRow = z.infer<typeof workStatCsvRowSchema>

/**
 * Schema for work stats row with resolved IDs (after lookup)
 */
export const workStatRowSchema = z.object({
  worker_id: z.string().regex(uuidRegex, 'Invalid worker ID format'),
  worker_account_id: z.string().regex(uuidRegex, 'Invalid worker account ID format').optional().nullable(),
  project_id: z.string().regex(uuidRegex, 'Invalid project ID format'),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  units_completed: z.coerce.number().int().nonnegative('Units must be non-negative').optional().nullable(),
  hours_worked: z.coerce.number().nonnegative('Hours must be non-negative').max(24, 'Hours cannot exceed 24').optional().nullable(),
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
  data?: WorkStatCsvRow
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

/**
 * Resolved lookup result from email/code to IDs
 */
export interface WorkStatLookupResult {
  worker_id: string
  worker_account_id: string | null
  project_id: string
}
