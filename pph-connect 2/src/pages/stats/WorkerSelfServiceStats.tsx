import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import {
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
  FolderOpen,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type WorkStat = {
  id: string
  worker_id: string
  project_id: string
  work_date: string
  units_completed: number | null
  hours_worked: number | null
  earnings: number | null
  project?: {
    id: string
    name: string
  } | null
}

type Worker = {
  id: string
  hr_id: string
  full_name: string
  email: string
  pph_email: string | null
  status: string
  hire_date: string | null
}

type WorkerAssignment = {
  id: string
  project: {
    id: string
    name: string
    code: string
    status: string
  }
  team: {
    id: string
    name: string
  } | null
  assigned_at: string
}

export function WorkerSelfServiceStats() {
  const { user, profile } = useAuth()

  // Filter states
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  // Find the worker record linked to this user
  const { data: linkedWorker, isLoading: isLoadingWorker, error: workerError } = useQuery({
    queryKey: ['my-worker-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null

      // Try to find worker by email match
      const { data, error } = await supabase
        .from('workers')
        .select('id, hr_id, full_name, email, pph_email, status, hire_date')
        .or(`email.eq.${user.email},pph_email.eq.${user.email}`)
        .single()

      if (error) {
        console.error('Error finding linked worker:', error)
        return null
      }
      return data as Worker
    },
    enabled: !!user?.email,
  })

  // Fetch current project assignments
  const { data: assignments } = useQuery({
    queryKey: ['my-assignments', linkedWorker?.id],
    queryFn: async () => {
      if (!linkedWorker?.id) return []

      const { data, error } = await supabase
        .from('worker_assignments')
        .select(`
          id,
          assigned_at,
          project:workforce_projects!worker_assignments_project_id_fkey(id, name, code, status),
          team:teams!worker_assignments_team_id_fkey(id, name)
        `)
        .eq('worker_id', linkedWorker.id)
        .is('removed_at', null)
        .order('assigned_at', { ascending: false })

      if (error) throw error
      return data as WorkerAssignment[]
    },
    enabled: !!linkedWorker?.id,
  })

  // Fetch work stats for this worker
  const { data: workStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['my-work-stats', linkedWorker?.id, fromDate, toDate],
    queryFn: async () => {
      if (!linkedWorker?.id) return []

      let query = supabase
        .from('work_stats')
        .select(`
          id,
          worker_id,
          project_id,
          work_date,
          units_completed,
          hours_worked,
          earnings,
          project:projects!work_stats_project_id_fkey(id, name)
        `)
        .eq('worker_id', linkedWorker.id)
        .order('work_date', { ascending: false })

      if (fromDate) {
        query = query.gte('work_date', format(fromDate, 'yyyy-MM-dd'))
      }
      if (toDate) {
        query = query.lte('work_date', format(toDate, 'yyyy-MM-dd'))
      }

      const { data, error } = await query

      if (error) throw error
      return data as WorkStat[]
    },
    enabled: !!linkedWorker?.id,
  })

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!workStats || workStats.length === 0) {
      return {
        totalUnits: 0,
        totalHours: 0,
        totalEarnings: 0,
        avgUnitsPerDay: 0,
        avgHoursPerDay: 0,
        daysWorked: 0,
      }
    }

    const totalUnits = workStats.reduce((sum, stat) => sum + (stat.units_completed || 0), 0)
    const totalHours = workStats.reduce((sum, stat) => sum + (stat.hours_worked || 0), 0)
    const totalEarnings = workStats.reduce((sum, stat) => sum + (stat.earnings || 0), 0)
    const uniqueDays = new Set(workStats.map((s) => s.work_date)).size

    return {
      totalUnits,
      totalHours,
      totalEarnings,
      avgUnitsPerDay: uniqueDays > 0 ? Math.round(totalUnits / uniqueDays) : 0,
      avgHoursPerDay: uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '0',
      daysWorked: uniqueDays,
    }
  }, [workStats])

  // Calculate earnings over time
  const earningsOverTime = useMemo(() => {
    if (!workStats || workStats.length === 0) return []

    const earningsByDate: Record<string, number> = {}
    workStats.forEach((stat) => {
      const date = stat.work_date
      earningsByDate[date] = (earningsByDate[date] || 0) + (stat.earnings || 0)
    })

    return Object.entries(earningsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, earnings]) => ({
        date: format(parseISO(date), 'MMM d'),
        fullDate: date,
        earnings: Number(earnings.toFixed(2)),
      }))
  }, [workStats])

  // Paginated stats
  const paginatedStats = useMemo(() => {
    if (!workStats) return []
    const start = currentPage * pageSize
    return workStats.slice(start, start + pageSize)
  }, [workStats, currentPage])

  const totalPages = Math.ceil((workStats?.length || 0) / pageSize)

  // Quick date range presets
  const setQuickDateRange = (preset: string) => {
    const today = new Date()
    switch (preset) {
      case 'last7':
        setFromDate(subDays(today, 7))
        setToDate(today)
        break
      case 'last30':
        setFromDate(subDays(today, 30))
        setToDate(today)
        break
      case 'thisMonth':
        setFromDate(startOfMonth(today))
        setToDate(endOfMonth(today))
        break
      case 'lastMonth':
        const lastMonth = subMonths(today, 1)
        setFromDate(startOfMonth(lastMonth))
        setToDate(endOfMonth(lastMonth))
        break
    }
    setCurrentPage(0)
  }

  if (isLoadingWorker) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!linkedWorker) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Worker Profile Found</AlertTitle>
          <AlertDescription>
            Your user account ({user?.email}) is not linked to a worker profile in the system.
            Please contact your administrator to set up your worker profile.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Stats</h1>
        <p className="text-muted-foreground">
          View your work statistics, earnings, and project assignments
        </p>
      </div>

      {/* Profile Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{linkedWorker.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">HR ID</p>
              <p className="font-medium">{linkedWorker.hr_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={linkedWorker.status === 'active' ? 'default' : 'secondary'}>
                {linkedWorker.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hire Date</p>
              <p className="font-medium">
                {linkedWorker.hire_date
                  ? format(new Date(linkedWorker.hire_date), 'MMM d, yyyy')
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Current Assignments
          </CardTitle>
          <CardDescription>Projects you are currently assigned to</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments && assignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{assignment.project.name}</p>
                      <p className="text-sm text-muted-foreground">{assignment.project.code}</p>
                    </div>
                    <Badge variant={assignment.project.status === 'active' ? 'default' : 'secondary'}>
                      {assignment.project.status}
                    </Badge>
                  </div>
                  {assignment.team && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Team: {assignment.team.name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned: {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              You are not currently assigned to any projects.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Date Filters */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last7')}>
          Last 7 Days
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last30')}>
          Last 30 Days
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('thisMonth')}>
          This Month
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('lastMonth')}>
          Last Month
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!fromDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, 'MMM d') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(date) => { setFromDate(date); setCurrentPage(0); }}
                disabled={(date) => toDate ? date > toDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!toDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, 'MMM d') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(date) => { setToDate(date); setCurrentPage(0); }}
                disabled={(date) => fromDate ? date < fromDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalUnits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg {summaryStats.avgUnitsPerDay} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Avg {summaryStats.avgHoursPerDay}h per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summaryStats.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Worked</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.daysWorked}</div>
            <p className="text-xs text-muted-foreground">
              Days with activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      {earningsOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              My Earnings Over Time
            </CardTitle>
            <CardDescription>Daily earnings in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={earningsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Work Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work History</CardTitle>
          <CardDescription>
            Showing {workStats?.length || 0} records in selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedStats.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStats.map((stat) => (
                      <TableRow key={stat.id}>
                        <TableCell>
                          {format(new Date(stat.work_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {stat.project?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {stat.units_completed !== null ? (
                            <Badge variant="secondary">{stat.units_completed.toLocaleString()}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {stat.hours_worked !== null ? `${stat.hours_worked.toFixed(1)}h` : '-'}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {stat.earnings !== null ? `$${stat.earnings.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No work stats found</h3>
              <p className="text-muted-foreground">
                No work statistics recorded for the selected period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkerSelfServiceStats
