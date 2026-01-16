import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  DollarSign,
  AlertCircle,
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  email_personal: string
  email_pph: string | null
}

type WorkStat = {
  id: string
  work_date: string
  earnings: number | null
  units_completed: number | null
  hours_worked: number | null
  project: {
    id: string
    name: string
  } | null
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

// Helper function to escape CSV values
const escapeCSVValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  // If the value contains comma, quote, or newline, wrap it in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export function WorkerEarnings() {
  const { user } = useAuth()

  // Date range state
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 15

  // Find the worker record linked to this user
  const { data: linkedWorker, isLoading: isLoadingWorker } = useQuery({
    queryKey: ['my-worker-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null

      const { data, error } = await supabase
        .from('workers')
        .select('id, hr_id, full_name, email_personal, email_pph')
        .or(`email_personal.eq.${user.email},email_pph.eq.${user.email}`)
        .single()

      if (error) {
        console.error('Error finding linked worker:', error)
        return null
      }
      return data as Worker
    },
    enabled: !!user?.email,
  })

  // Fetch work stats with earnings
  const { data: workStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['my-earnings-data', linkedWorker?.id, fromDate, toDate],
    queryFn: async () => {
      if (!linkedWorker?.id) return []

      let query = supabase
        .from('work_stats')
        .select(`
          id,
          work_date,
          earnings,
          units_completed,
          hours_worked,
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

  // Fetch all-time earnings for comparison
  const { data: allTimeStats } = useQuery({
    queryKey: ['my-all-time-earnings', linkedWorker?.id],
    queryFn: async () => {
      if (!linkedWorker?.id) return null

      const { data, error } = await supabase
        .from('work_stats')
        .select('earnings, work_date')
        .eq('worker_id', linkedWorker.id)

      if (error) throw error

      const total = data?.reduce((sum, s) => sum + (s.earnings || 0), 0) || 0
      const thisMonth = data?.filter(s => {
        const date = new Date(s.work_date)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }).reduce((sum, s) => sum + (s.earnings || 0), 0) || 0

      const lastMonth = data?.filter(s => {
        const date = new Date(s.work_date)
        const lastMonthDate = subMonths(new Date(), 1)
        return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear()
      }).reduce((sum, s) => sum + (s.earnings || 0), 0) || 0

      return { total, thisMonth, lastMonth }
    },
    enabled: !!linkedWorker?.id,
  })

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!workStats || workStats.length === 0) {
      return { totalEarnings: 0, totalUnits: 0, totalHours: 0, avgEarningsPerDay: 0, daysWorked: 0 }
    }

    const totalEarnings = workStats.reduce((sum, stat) => sum + (stat.earnings || 0), 0)
    const totalUnits = workStats.reduce((sum, stat) => sum + (stat.units_completed || 0), 0)
    const totalHours = workStats.reduce((sum, stat) => sum + (stat.hours_worked || 0), 0)
    const uniqueDays = new Set(workStats.map(s => s.work_date)).size

    return {
      totalEarnings,
      totalUnits,
      totalHours,
      avgEarningsPerDay: uniqueDays > 0 ? totalEarnings / uniqueDays : 0,
      daysWorked: uniqueDays,
    }
  }, [workStats])

  // Earnings by project
  const earningsByProject = useMemo(() => {
    if (!workStats || workStats.length === 0) return []

    const byProject: Record<string, { name: string; earnings: number; units: number }> = {}

    workStats.forEach(stat => {
      const projectId = stat.project?.id || 'unknown'
      const projectName = stat.project?.name || 'Unknown Project'

      if (!byProject[projectId]) {
        byProject[projectId] = { name: projectName, earnings: 0, units: 0 }
      }
      byProject[projectId].earnings += stat.earnings || 0
      byProject[projectId].units += stat.units_completed || 0
    })

    return Object.entries(byProject)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
  }, [workStats])

  // Earnings over time (for chart)
  const earningsOverTime = useMemo(() => {
    if (!workStats || workStats.length === 0) return []

    const byDate: Record<string, number> = {}
    workStats.forEach(stat => {
      const date = stat.work_date
      byDate[date] = (byDate[date] || 0) + (stat.earnings || 0)
    })

    return Object.entries(byDate)
      .map(([date, earnings]) => ({ date, earnings }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [workStats])

  // Paginated history
  const paginatedHistory = useMemo(() => {
    if (!workStats) return []
    const start = currentPage * pageSize
    return workStats.slice(start, start + pageSize)
  }, [workStats, currentPage])

  const totalPages = Math.ceil((workStats?.length || 0) / pageSize)

  // Month-over-month change
  const monthChange = useMemo(() => {
    if (!allTimeStats) return null
    if (allTimeStats.lastMonth === 0) return null
    const change = ((allTimeStats.thisMonth - allTimeStats.lastMonth) / allTimeStats.lastMonth) * 100
    return change
  }, [allTimeStats])

  // Export to CSV function
  const exportToCSV = () => {
    if (!workStats || workStats.length === 0) {
      alert('No data to export for the selected period.')
      return
    }

    // CSV header
    const headers = ['Date', 'Project', 'Units Completed', 'Hours Worked', 'Earnings ($)']

    // CSV rows
    const rows = workStats.map(stat => [
      escapeCSVValue(format(new Date(stat.work_date), 'yyyy-MM-dd')),
      escapeCSVValue(stat.project?.name || 'Unknown'),
      escapeCSVValue(stat.units_completed),
      escapeCSVValue(stat.hours_worked?.toFixed(2)),
      escapeCSVValue(stat.earnings?.toFixed(2)),
    ])

    // Add summary row
    rows.push([]) // Empty row
    rows.push(['Summary', '', '', '', ''])
    rows.push(['Total Units', '', escapeCSVValue(summaryStats.totalUnits), '', ''])
    rows.push(['Total Hours', '', '', escapeCSVValue(summaryStats.totalHours.toFixed(2)), ''])
    rows.push(['Total Earnings', '', '', '', escapeCSVValue(summaryStats.totalEarnings.toFixed(2))])
    rows.push(['Days Worked', escapeCSVValue(summaryStats.daysWorked), '', '', ''])
    rows.push(['Avg Earnings/Day', '', '', '', escapeCSVValue(summaryStats.avgEarningsPerDay.toFixed(2))])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    // Generate filename with date range
    const fromStr = fromDate ? format(fromDate, 'yyyy-MM-dd') : 'all'
    const toStr = toDate ? format(toDate, 'yyyy-MM-dd') : 'all'
    const filename = `earnings_${linkedWorker?.hr_id || 'export'}_${fromStr}_to_${toStr}.csv`

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (isLoadingWorker) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Earnings</h1>
          <p className="text-muted-foreground">
            Track your earnings, view breakdowns by project, and analyze trends
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          disabled={!workStats || workStats.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${allTimeStats?.total.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                ${allTimeStats?.thisMonth.toFixed(2) || '0.00'}
              </span>
              {monthChange !== null && (
                <Badge variant={monthChange >= 0 ? 'default' : 'destructive'} className="text-xs">
                  {monthChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(monthChange).toFixed(0)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              vs ${allTimeStats?.lastMonth.toFixed(2) || '0.00'} last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Period</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${summaryStats.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.daysWorked} days worked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summaryStats.avgEarningsPerDay.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.totalUnits.toLocaleString()} units completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[150px]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {fromDate ? format(fromDate, 'MMM d, yyyy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[150px]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {toDate ? format(toDate, 'MMM d, yyyy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    disabled={(date) => fromDate ? date < fromDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate(subDays(new Date(), 7))
                  setToDate(new Date())
                }}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate(subDays(new Date(), 30))
                  setToDate(new Date())
                }}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate(startOfMonth(new Date()))
                  setToDate(endOfMonth(new Date()))
                }}
              >
                This month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Over Time
            </CardTitle>
            <CardDescription>Daily earnings in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-[250px]" />
            ) : earningsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={earningsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Earnings']}
                    labelFormatter={(date) => format(new Date(date as string), 'MMM d, yyyy')}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No earnings data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings by Project Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Breakdown by Project
            </CardTitle>
            <CardDescription>Earnings distribution across projects</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-[250px]" />
            ) : earningsByProject.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={earningsByProject}
                      dataKey="earnings"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {earningsByProject.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {earningsByProject.slice(0, 5).map((project, index) => (
                    <div key={project.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm truncate flex-1">{project.name}</span>
                      <span className="text-sm font-medium">${project.earnings.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No project data for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Earnings by Project
          </CardTitle>
          <CardDescription>Detailed breakdown of earnings per project</CardDescription>
        </CardHeader>
        <CardContent>
          {earningsByProject.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earningsByProject.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-right">{project.units.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ${project.earnings.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {summaryStats.totalEarnings > 0
                        ? ((project.earnings / summaryStats.totalEarnings) * 100).toFixed(1)
                        : '0'}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{summaryStats.totalUnits.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600">
                    ${summaryStats.totalEarnings.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No project earnings data for selected period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Earnings History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earnings History
          </CardTitle>
          <CardDescription>Detailed daily earnings log</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : paginatedHistory.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHistory.map((stat) => (
                    <TableRow key={stat.id}>
                      <TableCell>{format(new Date(stat.work_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{stat.project?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">{stat.units_completed?.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right">{stat.hours_worked?.toFixed(1) || '-'}h</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        ${stat.earnings?.toFixed(2) || '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, workStats?.length || 0)} of {workStats?.length || 0} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No earnings history for selected period
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkerEarnings
