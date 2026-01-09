import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import {
  Upload,
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Trophy,
  Medal,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type WorkStat = {
  id: string
  worker_id: string
  worker_account_id: string | null
  project_id: string
  work_date: string
  units_completed: number | null
  hours_worked: number | null
  earnings: number | null
  created_at: string
  created_by: string | null
  // Joined data
  worker?: {
    id: string
    hr_id: string
    full_name: string
  } | null
  project?: {
    id: string
    name: string
  } | null
}

type Worker = {
  id: string
  hr_id: string
  full_name: string
}

type Project = {
  id: string
  name: string
}

export function StatsPage() {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'work_date', desc: true }])

  // Filter states - separate from and to dates for independent selection
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [selectedWorker, setSelectedWorker] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')

  // Fetch workers for filter dropdown
  const { data: workers } = useQuery({
    queryKey: ['workers-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, hr_id, full_name')
        .order('full_name')

      if (error) throw error
      return data as Worker[]
    },
  })

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data as Project[]
    },
  })

  // Fetch work stats with filters
  const { data: workStats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['work-stats', fromDate, toDate, selectedWorker, selectedProject],
    queryFn: async () => {
      let query = supabase
        .from('work_stats')
        .select(`
          id,
          worker_id,
          worker_account_id,
          project_id,
          work_date,
          units_completed,
          hours_worked,
          earnings,
          created_at,
          created_by,
          worker:workers!work_stats_worker_id_fkey(id, hr_id, full_name),
          project:projects!work_stats_project_id_fkey(id, name)
        `)
        .order('work_date', { ascending: false })

      // Apply date range filter
      if (fromDate) {
        query = query.gte('work_date', format(fromDate, 'yyyy-MM-dd'))
      }
      if (toDate) {
        query = query.lte('work_date', format(toDate, 'yyyy-MM-dd'))
      }

      // Apply worker filter
      if (selectedWorker && selectedWorker !== 'all') {
        query = query.eq('worker_id', selectedWorker)
      }

      // Apply project filter
      if (selectedProject && selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject)
      }

      const { data, error } = await query

      if (error) throw error
      return data as WorkStat[]
    },
  })

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!workStats || workStats.length === 0) {
      return {
        totalRecords: 0,
        totalUnits: 0,
        totalHours: 0,
        totalEarnings: 0,
        avgUnitsPerDay: 0,
        avgHoursPerDay: 0,
        activeWorkers: 0,
      }
    }

    const totalUnits = workStats.reduce((sum, stat) => sum + (stat.units_completed || 0), 0)
    const totalHours = workStats.reduce((sum, stat) => sum + (stat.hours_worked || 0), 0)
    const totalEarnings = workStats.reduce((sum, stat) => sum + (stat.earnings || 0), 0)
    const uniqueDays = new Set(workStats.map((s) => s.work_date)).size
    const activeWorkers = new Set(workStats.map((s) => s.worker_id)).size

    return {
      totalRecords: workStats.length,
      totalUnits,
      totalHours,
      totalEarnings,
      avgUnitsPerDay: uniqueDays > 0 ? Math.round(totalUnits / uniqueDays) : 0,
      avgHoursPerDay: uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '0',
      activeWorkers,
    }
  }, [workStats])

  // Calculate earnings over time (grouped by date)
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

  // Calculate units by project
  const unitsByProject = useMemo(() => {
    if (!workStats || workStats.length === 0) return []

    const projectStats: Record<string, { name: string; units: number; hours: number }> = {}
    workStats.forEach((stat) => {
      const projectId = stat.project_id
      const projectName = stat.project?.name || 'Unknown Project'
      if (!projectStats[projectId]) {
        projectStats[projectId] = { name: projectName, units: 0, hours: 0 }
      }
      projectStats[projectId].units += stat.units_completed || 0
      projectStats[projectId].hours += stat.hours_worked || 0
    })

    return Object.values(projectStats)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5) // Top 5 projects
  }, [workStats])

  // Calculate top earners
  const topEarners = useMemo(() => {
    if (!workStats || workStats.length === 0) return []

    const workerStats: Record<string, { name: string; hrId: string; earnings: number; units: number; hours: number }> = {}
    workStats.forEach((stat) => {
      const workerId = stat.worker_id
      const workerName = stat.worker?.full_name || 'Unknown Worker'
      const hrId = stat.worker?.hr_id || ''
      if (!workerStats[workerId]) {
        workerStats[workerId] = { name: workerName, hrId, earnings: 0, units: 0, hours: 0 }
      }
      workerStats[workerId].earnings += stat.earnings || 0
      workerStats[workerId].units += stat.units_completed || 0
      workerStats[workerId].hours += stat.hours_worked || 0
    })

    return Object.entries(workerStats)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 10) // Top 10 earners
  }, [workStats])

  // Table columns
  const columns: ColumnDef<WorkStat>[] = useMemo(
    () => [
      {
        accessorKey: 'work_date',
        header: 'Date',
        cell: ({ row }) => format(new Date(row.original.work_date), 'MMM d, yyyy'),
      },
      {
        accessorKey: 'worker',
        header: 'Worker',
        cell: ({ row }) => {
          const worker = row.original.worker
          return worker ? (
            <div>
              <div className="font-medium">{worker.full_name}</div>
              <div className="text-xs text-muted-foreground">{worker.hr_id}</div>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'project',
        header: 'Project',
        cell: ({ row }) => {
          const project = row.original.project
          return project ? (
            <span>{project.name}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'units_completed',
        header: 'Units',
        cell: ({ row }) => {
          const units = row.original.units_completed
          return units !== null ? (
            <Badge variant="secondary">{units.toLocaleString()}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'hours_worked',
        header: 'Hours',
        cell: ({ row }) => {
          const hours = row.original.hours_worked
          return hours !== null ? (
            <span>{hours.toFixed(1)}h</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'earnings',
        header: 'Earnings',
        cell: ({ row }) => {
          const earnings = row.original.earnings
          return earnings !== null ? (
            <span className="font-medium">${earnings.toFixed(2)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Imported',
        cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
      },
    ],
    []
  )

  const table = useReactTable({
    data: workStats || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  // Clear all filters
  const clearFilters = () => {
    setFromDate(subDays(new Date(), 30))
    setToDate(new Date())
    setSelectedWorker('all')
    setSelectedProject('all')
  }

  // Quick date range presets
  const setQuickDateRange = (preset: string) => {
    const today = new Date()
    switch (preset) {
      case 'today':
        setFromDate(today)
        setToDate(today)
        break
      case 'last7':
        setFromDate(subDays(today, 7))
        setToDate(today)
        break
      case 'last30':
        setFromDate(subDays(today, 30))
        setToDate(today)
        break
      case 'last90':
        setFromDate(subDays(today, 90))
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
      case 'allTime':
        setFromDate(undefined)
        setToDate(undefined)
        break
    }
  }

  // Check if any filters are active
  const hasActiveFilters =
    selectedWorker !== 'all' ||
    selectedProject !== 'all' ||
    (fromDate && format(fromDate, 'yyyy-MM-dd') !== format(subDays(new Date(), 30), 'yyyy-MM-dd')) ||
    (toDate && format(toDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd'))

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load work stats: {error?.message || 'Unknown error'}
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
          <h1 className="text-3xl font-bold">Work Stats</h1>
          <p className="text-muted-foreground">
            View and manage worker productivity statistics
          </p>
        </div>
        <Button onClick={() => navigate('/stats/import')}>
          <Upload className="mr-2 h-4 w-4" />
          Import Stats
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.activeWorkers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.totalRecords} records in period
            </p>
          </CardContent>
        </Card>

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
            <div className="text-2xl font-bold">${summaryStats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all workers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Over Time - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Over Time
            </CardTitle>
            <CardDescription>Daily earnings in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {earningsOverTime.length > 0 ? (
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
                      borderRadius: '8px'
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
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No earnings data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Units by Project - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Units by Project
            </CardTitle>
            <CardDescription>Top 5 projects by units completed</CardDescription>
          </CardHeader>
          <CardContent>
            {unitsByProject.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={unitsByProject} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={150}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === 'units' ? 'Units' : 'Hours'
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar
                    dataKey="units"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Earners Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Earners
          </CardTitle>
          <CardDescription>Workers ranked by earnings in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {topEarners.length > 0 ? (
            <div className="space-y-3">
              {topEarners.map((earner, index) => {
                const getRankIcon = (rank: number) => {
                  switch (rank) {
                    case 0: return <Trophy className="h-5 w-5 text-yellow-500" />
                    case 1: return <Medal className="h-5 w-5 text-gray-400" />
                    case 2: return <Award className="h-5 w-5 text-amber-600" />
                    default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">{rank + 1}</span>
                  }
                }

                return (
                  <div
                    key={earner.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      index === 0 && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
                      index === 1 && "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700",
                      index === 2 && "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
                      index > 2 && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(index)}
                      </div>
                      <div>
                        <div className="font-medium">{earner.name}</div>
                        <div className="text-xs text-muted-foreground">{earner.hrId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-sm text-muted-foreground">Units</div>
                        <div className="font-medium">{earner.units.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Hours</div>
                        <div className="font-medium">{earner.hours.toFixed(1)}h</div>
                      </div>
                      <div className="min-w-[80px]">
                        <div className="text-sm text-muted-foreground">Earnings</div>
                        <div className="font-bold text-green-600 dark:text-green-400">${earner.earnings.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mb-4 opacity-50" />
              <p>No earner data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Date Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange('today')}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last7')}>
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last30')}>
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last90')}>
              Last 90 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange('thisMonth')}>
              This Month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange('lastMonth')}>
              Last Month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange('allTime')}>
              All Time
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* From Date Picker */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fromDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'MMM d, yyyy') : <span>Select start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    disabled={(date) => toDate ? date > toDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date Picker */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !toDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'MMM d, yyyy') : <span>Select end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    disabled={(date) => fromDate ? date < fromDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Worker Filter */}
            <div className="space-y-2">
              <Label>Worker</Label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="All Workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {workers?.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Stats History</CardTitle>
          <CardDescription>
            Showing {workStats?.length || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workStats && workStats.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    workStats.length
                  )}{' '}
                  of {workStats.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No work stats found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters or import some stats.'
                  : 'Get started by importing work stats from a CSV file.'}
              </p>
              <Button onClick={() => navigate('/stats/import')}>
                <Upload className="mr-2 h-4 w-4" />
                Import Stats
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default StatsPage
