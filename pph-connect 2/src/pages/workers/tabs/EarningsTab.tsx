import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths } from 'date-fns'
import { DollarSign, TrendingUp, Calendar, Briefcase } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  calculateWorkerBalance,
  getBalanceBreakdown,
  type WorkerBalanceSummary,
  type ProjectBalanceBreakdown,
} from '@/services/balanceService'
import { supabase } from '@/lib/supabase/client'

type EarningsTabProps = {
  workerId: string
  workerName: string
}

type DailyEarning = {
  work_date: string
  earnings: number
  units_completed: number
  hours_worked: number
  project_name: string
}

export function EarningsTab({ workerId, workerName }: EarningsTabProps) {
  // Date ranges
  const today = new Date()
  const thisMonthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const thisMonthEnd = format(endOfMonth(today), 'yyyy-MM-dd')
  const thisQuarterStart = format(startOfQuarter(today), 'yyyy-MM-dd')
  const thisQuarterEnd = format(endOfQuarter(today), 'yyyy-MM-dd')
  const lastSixMonthsStart = format(subMonths(today, 6), 'yyyy-MM-dd')

  // Fetch this month's balance
  const { data: thisMonthBalance, isLoading: isLoadingMonth } = useQuery({
    queryKey: ['worker-balance-month', workerId, thisMonthStart, thisMonthEnd],
    queryFn: () => calculateWorkerBalance(workerId, thisMonthStart, thisMonthEnd),
  })

  // Fetch this quarter's balance
  const { data: thisQuarterBalance, isLoading: isLoadingQuarter } = useQuery({
    queryKey: ['worker-balance-quarter', workerId, thisQuarterStart, thisQuarterEnd],
    queryFn: () => calculateWorkerBalance(workerId, thisQuarterStart, thisQuarterEnd),
  })

  // Fetch all-time balance (last 2 years as proxy)
  const { data: totalBalance, isLoading: isLoadingTotal } = useQuery({
    queryKey: ['worker-balance-total', workerId],
    queryFn: () => calculateWorkerBalance(workerId, '2020-01-01', format(today, 'yyyy-MM-dd')),
  })

  // Fetch breakdown by project (last 6 months)
  const { data: projectBreakdown, isLoading: isLoadingBreakdown } = useQuery({
    queryKey: ['worker-balance-breakdown', workerId, lastSixMonthsStart],
    queryFn: () => getBalanceBreakdown(workerId, lastSixMonthsStart, format(today, 'yyyy-MM-dd')),
  })

  // Fetch daily earnings for chart/table (last 30 days)
  const thirtyDaysAgo = format(subMonths(today, 1), 'yyyy-MM-dd')
  const { data: dailyEarnings, isLoading: isLoadingDaily } = useQuery({
    queryKey: ['worker-daily-earnings', workerId, thirtyDaysAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_stats')
        .select(`
          work_date,
          earnings,
          units_completed,
          hours_worked,
          projects:project_id (
            name
          )
        `)
        .eq('worker_id', workerId)
        .gte('work_date', thirtyDaysAgo)
        .order('work_date', { ascending: false })

      if (error) throw error

      return (data || []).map((d) => ({
        work_date: d.work_date,
        earnings: d.earnings || 0,
        units_completed: d.units_completed || 0,
        hours_worked: d.hours_worked || 0,
        project_name: (d.projects as unknown as { name: string })?.name || 'Unknown',
      })) as DailyEarning[]
    },
  })

  // Calculate monthly trend data for simple chart visualization
  const monthlyData = useMemo(() => {
    if (!dailyEarnings) return []

    const monthMap = new Map<string, number>()
    dailyEarnings.forEach((d) => {
      const monthKey = d.work_date.substring(0, 7) // YYYY-MM
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + d.earnings)
    })

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy'),
        total,
      }))
  }, [dailyEarnings])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const isLoading = isLoadingMonth || isLoadingQuarter || isLoadingTotal

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBalance?.total_earnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalBalance?.work_days || 0} work days recorded
            </p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(thisMonthBalance?.total_earnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {thisMonthBalance?.total_units || 0} units | {thisMonthBalance?.total_hours?.toFixed(1) || 0} hours
            </p>
          </CardContent>
        </Card>

        {/* This Quarter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Quarter</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(thisQuarterBalance?.total_earnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {thisQuarterBalance?.work_days || 0} work days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Area Chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Over Time
            </CardTitle>
            <CardDescription>Monthly earnings breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                    width={80}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {payload[0].payload.month}
                                </span>
                                <span className="font-bold text-primary">
                                  {formatCurrency(payload[0].value as number)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown by Project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Earnings by Project
          </CardTitle>
          <CardDescription>Last 6 months breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBreakdown ? (
            <Skeleton className="h-48" />
          ) : projectBreakdown && projectBreakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectBreakdown.map((project) => (
                  <TableRow key={project.project_id}>
                    <TableCell className="font-medium">{project.project_name}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(project.total_earnings)}
                    </TableCell>
                    <TableCell className="text-right">{project.total_units}</TableCell>
                    <TableCell className="text-right">{project.total_hours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{project.work_days}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No project earnings recorded in the last 6 months.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Earnings by Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Earnings
          </CardTitle>
          <CardDescription>Last 30 days detailed breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDaily ? (
            <Skeleton className="h-48" />
          ) : dailyEarnings && dailyEarnings.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
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
                  {dailyEarnings.map((entry, idx) => (
                    <TableRow key={`${entry.work_date}-${idx}`}>
                      <TableCell>{format(new Date(entry.work_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{entry.project_name}</TableCell>
                      <TableCell className="text-right">{entry.units_completed || '-'}</TableCell>
                      <TableCell className="text-right">
                        {entry.hours_worked ? entry.hours_worked.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {entry.earnings ? formatCurrency(entry.earnings) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No earnings recorded in the last 30 days.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
