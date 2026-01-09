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
import { Input } from '@/components/ui/input'
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
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

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

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
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
    queryKey: ['work-stats', dateRange, selectedWorker, selectedProject],
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
      if (dateRange?.from) {
        query = query.gte('work_date', format(dateRange.from, 'yyyy-MM-dd'))
      }
      if (dateRange?.to) {
        query = query.lte('work_date', format(dateRange.to, 'yyyy-MM-dd'))
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
      }
    }

    const totalUnits = workStats.reduce((sum, stat) => sum + (stat.units_completed || 0), 0)
    const totalHours = workStats.reduce((sum, stat) => sum + (stat.hours_worked || 0), 0)
    const totalEarnings = workStats.reduce((sum, stat) => sum + (stat.earnings || 0), 0)
    const uniqueDays = new Set(workStats.map((s) => s.work_date)).size

    return {
      totalRecords: workStats.length,
      totalUnits,
      totalHours,
      totalEarnings,
      avgUnitsPerDay: uniqueDays > 0 ? Math.round(totalUnits / uniqueDays) : 0,
      avgHoursPerDay: uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '0',
    }
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
    setDateRange({
      from: subDays(new Date(), 30),
      to: new Date(),
    })
    setSelectedWorker('all')
    setSelectedProject('all')
  }

  // Quick date range presets
  const setQuickDateRange = (preset: string) => {
    const today = new Date()
    switch (preset) {
      case 'today':
        setDateRange({ from: today, to: today })
        break
      case 'last7':
        setDateRange({ from: subDays(today, 7), to: today })
        break
      case 'last30':
        setDateRange({ from: subDays(today, 30), to: today })
        break
      case 'thisMonth':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) })
        break
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(today), 1)
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) })
        break
    }
  }

  // Check if any filters are active
  const hasActiveFilters =
    selectedWorker !== 'all' ||
    selectedProject !== 'all' ||
    (dateRange?.from && dateRange?.to &&
      (format(dateRange.from, 'yyyy-MM-dd') !== format(subDays(new Date(), 30), 'yyyy-MM-dd') ||
       format(dateRange.to, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')))

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
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              In selected date range
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'MMM d, yyyy')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex flex-col">
                    <div className="flex gap-1 p-2 border-b">
                      <Button variant="ghost" size="sm" onClick={() => setQuickDateRange('today')}>
                        Today
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setQuickDateRange('last7')}>
                        Last 7d
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setQuickDateRange('last30')}>
                        Last 30d
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setQuickDateRange('thisMonth')}>
                        This Month
                      </Button>
                    </div>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </div>
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
