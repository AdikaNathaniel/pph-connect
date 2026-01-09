import { supabase } from '@/lib/supabase/client'

/**
 * Balance breakdown by project
 */
export interface ProjectBalanceBreakdown {
  project_id: string
  project_name: string
  total_earnings: number
  total_units: number
  total_hours: number
  work_days: number
}

/**
 * Worker balance summary
 */
export interface WorkerBalanceSummary {
  worker_id: string
  total_earnings: number
  total_units: number
  total_hours: number
  work_days: number
  currency: string
}

/**
 * Calculate total worker balance (earnings) for a date range
 * Aggregates SUM(earnings) from work_stats
 */
export async function calculateWorkerBalance(
  workerId: string,
  startDate: string,
  endDate: string
): Promise<WorkerBalanceSummary> {
  const { data, error } = await supabase
    .from('work_stats')
    .select('earnings, units_completed, hours_worked')
    .eq('worker_id', workerId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  if (error) {
    throw new Error(`Failed to calculate balance: ${error.message}`)
  }

  const stats = data || []

  return {
    worker_id: workerId,
    total_earnings: stats.reduce((sum, s) => sum + (s.earnings || 0), 0),
    total_units: stats.reduce((sum, s) => sum + (s.units_completed || 0), 0),
    total_hours: stats.reduce((sum, s) => sum + (s.hours_worked || 0), 0),
    work_days: stats.length,
    currency: 'USD', // Default currency - could be enhanced to support multiple currencies
  }
}

/**
 * Get balance breakdown by project for a worker
 * Returns earnings grouped by project
 */
export async function getBalanceBreakdown(
  workerId: string,
  startDate: string,
  endDate: string
): Promise<ProjectBalanceBreakdown[]> {
  const { data, error } = await supabase
    .from('work_stats')
    .select(`
      project_id,
      earnings,
      units_completed,
      hours_worked,
      projects:project_id (
        id,
        name
      )
    `)
    .eq('worker_id', workerId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  if (error) {
    throw new Error(`Failed to get balance breakdown: ${error.message}`)
  }

  // Group by project and aggregate
  const projectMap = new Map<string, ProjectBalanceBreakdown>()

  for (const stat of data || []) {
    const projectId = stat.project_id
    const projectInfo = stat.projects as unknown as { id: string; name: string } | null

    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, {
        project_id: projectId,
        project_name: projectInfo?.name || 'Unknown Project',
        total_earnings: 0,
        total_units: 0,
        total_hours: 0,
        work_days: 0,
      })
    }

    const entry = projectMap.get(projectId)!
    entry.total_earnings += stat.earnings || 0
    entry.total_units += stat.units_completed || 0
    entry.total_hours += stat.hours_worked || 0
    entry.work_days += 1
  }

  return Array.from(projectMap.values()).sort((a, b) => b.total_earnings - a.total_earnings)
}

/**
 * Get balance for multiple workers (useful for team/department reports)
 */
export async function getMultipleWorkersBalance(
  workerIds: string[],
  startDate: string,
  endDate: string
): Promise<WorkerBalanceSummary[]> {
  const balances = await Promise.all(
    workerIds.map((workerId) => calculateWorkerBalance(workerId, startDate, endDate))
  )
  return balances.sort((a, b) => b.total_earnings - a.total_earnings)
}

/**
 * Get balance summary for a specific project
 */
export async function getProjectBalance(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<{
  project_id: string
  total_earnings: number
  total_units: number
  total_hours: number
  worker_count: number
}> {
  const { data, error } = await supabase
    .from('work_stats')
    .select('worker_id, earnings, units_completed, hours_worked')
    .eq('project_id', projectId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  if (error) {
    throw new Error(`Failed to get project balance: ${error.message}`)
  }

  const stats = data || []
  const uniqueWorkers = new Set(stats.map((s) => s.worker_id))

  return {
    project_id: projectId,
    total_earnings: stats.reduce((sum, s) => sum + (s.earnings || 0), 0),
    total_units: stats.reduce((sum, s) => sum + (s.units_completed || 0), 0),
    total_hours: stats.reduce((sum, s) => sum + (s.hours_worked || 0), 0),
    worker_count: uniqueWorkers.size,
  }
}
