import { supabase } from '@/lib/supabase/client'
import type { WorkStatRow, WorkStatValidationError } from '@/lib/schemas/workStats'

/**
 * Check if a worker exists in the database
 */
export async function validateWorkerExists(workerId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('workers')
    .select('*', { count: 'exact', head: true })
    .eq('id', workerId)

  if (error) {
    console.error('Error validating worker:', error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Check if a worker account exists in the database
 */
export async function validateWorkerAccountExists(workerAccountId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('worker_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('id', workerAccountId)

  if (error) {
    console.error('Error validating worker account:', error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Check if a project exists in the database
 */
export async function validateProjectExists(projectId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('id', projectId)

  if (error) {
    console.error('Error validating project:', error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Check if a work stat entry already exists for the given worker, project, and date
 */
export async function checkDuplicateWorkStat(
  workerId: string,
  projectId: string,
  workDate: string,
  workerAccountId?: string | null
): Promise<boolean> {
  let query = supabase
    .from('work_stats')
    .select('*', { count: 'exact', head: true })
    .eq('worker_id', workerId)
    .eq('project_id', projectId)
    .eq('work_date', workDate)

  if (workerAccountId) {
    query = query.eq('worker_account_id', workerAccountId)
  }

  const { count, error } = await query

  if (error) {
    console.error('Error checking duplicate:', error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Validate work date is not in the future
 */
export function validateWorkDate(workDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(workDate)
  return date <= today
}

/**
 * Perform business logic validation on a work stat row
 */
export async function validateWorkStatRow(
  row: WorkStatRow,
  rowIndex: number
): Promise<WorkStatValidationError[]> {
  const errors: WorkStatValidationError[] = []

  // Validate worker exists
  const workerExists = await validateWorkerExists(row.worker_id)
  if (!workerExists) {
    errors.push({
      row: rowIndex,
      field: 'worker_id',
      message: `Worker with ID ${row.worker_id} does not exist`,
      data: row,
    })
  }

  // Validate worker account exists (if provided)
  if (row.worker_account_id) {
    const accountExists = await validateWorkerAccountExists(row.worker_account_id)
    if (!accountExists) {
      errors.push({
        row: rowIndex,
        field: 'worker_account_id',
        message: `Worker account with ID ${row.worker_account_id} does not exist`,
        data: row,
      })
    }
  }

  // Validate project exists
  const projectExists = await validateProjectExists(row.project_id)
  if (!projectExists) {
    errors.push({
      row: rowIndex,
      field: 'project_id',
      message: `Project with ID ${row.project_id} does not exist`,
      data: row,
    })
  }

  // Validate work date is not in the future
  if (!validateWorkDate(row.work_date)) {
    errors.push({
      row: rowIndex,
      field: 'work_date',
      message: 'Work date cannot be in the future',
      data: row,
    })
  }

  // Check for duplicate entry
  const isDuplicate = await checkDuplicateWorkStat(
    row.worker_id,
    row.project_id,
    row.work_date,
    row.worker_account_id
  )
  if (isDuplicate) {
    errors.push({
      row: rowIndex,
      field: 'work_date',
      message: 'Duplicate entry: Work stat already exists for this worker, project, and date',
      data: row,
    })
  }

  return errors
}

/**
 * Insert work stats in batches
 */
export async function insertWorkStats(
  rows: WorkStatRow[],
  createdBy: string | null,
  batchSize: number = 10
): Promise<{ successCount: number; errorCount: number; errors: WorkStatValidationError[] }> {
  let successCount = 0
  let errorCount = 0
  const errors: WorkStatValidationError[] = []

  // Process in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)

    // Prepare data for insertion
    // created_by references profiles table (linked to auth.users)
    const insertData = batch.map((row) => {
      const baseData: any = {
        worker_id: row.worker_id,
        project_id: row.project_id,
        work_date: row.work_date,
        units_completed: row.units_completed || null,
        hours_worked: row.hours_worked || null,
        earnings: row.earnings || null,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      }

      // Only include worker_account_id if it's provided
      if (row.worker_account_id) {
        baseData.worker_account_id = row.worker_account_id
      }

      return baseData
    })

    const { data, error } = await supabase.from('work_stats').insert(insertData).select()

    if (error) {
      console.error('Batch insert error:', error)
      errorCount += batch.length
      batch.forEach((row, idx) => {
        errors.push({
          row: i + idx + 2, // +2 for 1-based index and header row
          message: `Insert failed: ${error.message}`,
          data: row,
        })
      })
    } else {
      successCount += data?.length || 0
    }
  }

  return { successCount, errorCount, errors }
}

/**
 * Get work stats for a specific period
 */
export async function getWorkStatsForPeriod(
  workerId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('work_stats')
    .select(
      `
      *,
      workers:worker_id (
        id,
        hr_id,
        full_name,
        email_pph
      ),
      projects:project_id (
        id,
        name
      )
    `
    )
    .eq('worker_id', workerId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get aggregated stats for a worker over a period
 */
export async function getAggregatedWorkerStats(
  workerId: string,
  startDate: string,
  endDate: string
) {
  const stats = await getWorkStatsForPeriod(workerId, startDate, endDate)

  return {
    totalUnitsCompleted: stats.reduce((sum, s) => sum + (s.units_completed || 0), 0),
    totalHours: stats.reduce((sum, s) => sum + (s.hours_worked || 0), 0),
    totalEarnings: stats.reduce((sum, s) => sum + (s.earnings || 0), 0),
    workDays: stats.length,
    lineItems: stats,
  }
}

/**
 * Get all work stats with pagination
 */
export async function getAllWorkStats(
  page: number = 1,
  pageSize: number = 50,
  filters?: {
    workerId?: string
    projectId?: string
    startDate?: string
    endDate?: string
  }
) {
  let query = supabase
    .from('work_stats')
    .select(
      `
      *,
      workers:worker_id (
        id,
        hr_id,
        full_name,
        email_pph
      ),
      worker_accounts:worker_account_id (
        id,
        platform_type,
        worker_account_id
      ),
      projects:project_id (
        id,
        name
      )
    `,
      { count: 'exact' }
    )
    .order('work_date', { ascending: false })

  // Apply filters
  if (filters?.workerId) {
    query = query.eq('worker_id', filters.workerId)
  }
  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }
  if (filters?.startDate) {
    query = query.gte('work_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('work_date', filters.endDate)
  }

  // Apply pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}
