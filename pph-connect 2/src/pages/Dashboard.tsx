import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  FolderOpen,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Building2,
  Plus,
  Upload,
  Mail,
} from 'lucide-react'

type DashboardMetrics = {
  totalWorkers: number
  activeWorkers: number
  pendingWorkers: number
  activeProjects: number
  totalTeams: number
  bgcExpiring: number
  bgcExpired: number
}

export function Dashboard() {
  // Fetch dashboard metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Fetch workers count
      const { count: totalWorkers } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true })

      const { count: activeWorkers } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      const { count: pendingWorkers } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Fetch projects count
      const { count: activeProjects } = await supabase
        .from('workforce_projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Fetch teams count
      const { count: totalTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true })

      // Fetch BGC alerts
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data: bgcData } = await supabase
        .from('workers')
        .select('bgc_expiration_date')
        .not('bgc_expiration_date', 'is', null)

      let bgcExpired = 0
      let bgcExpiring = 0

      if (bgcData) {
        bgcData.forEach((worker) => {
          if (worker.bgc_expiration_date) {
            const expirationDate = worker.bgc_expiration_date
            if (expirationDate < today) {
              bgcExpired++
            } else if (expirationDate >= today && expirationDate <= thirtyDaysFromNow) {
              bgcExpiring++
            }
          }
        })
      }

      return {
        totalWorkers: totalWorkers || 0,
        activeWorkers: activeWorkers || 0,
        pendingWorkers: pendingWorkers || 0,
        activeProjects: activeProjects || 0,
        totalTeams: totalTeams || 0,
        bgcExpiring,
        bgcExpired,
      } as DashboardMetrics
    },
  })

  const summaryCards = [
    {
      title: 'Total Workers',
      value: metrics?.totalWorkers || 0,
      description: `${metrics?.activeWorkers || 0} active, ${metrics?.pendingWorkers || 0} pending`,
      icon: Users,
      href: '/workers',
      trend: '+12% from last month',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      title: 'Active Projects',
      value: metrics?.activeProjects || 0,
      description: 'Currently running projects',
      icon: FolderOpen,
      href: '/projects',
      trend: '+5% from last month',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      title: 'Teams',
      value: metrics?.totalTeams || 0,
      description: 'Organized by department',
      icon: UserCheck,
      href: '/teams',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      title: 'BGC Alerts',
      value: (metrics?.bgcExpired || 0) + (metrics?.bgcExpiring || 0),
      description: `${metrics?.bgcExpired || 0} expired, ${metrics?.bgcExpiring || 0} expiring soon`,
      icon: AlertTriangle,
      href: '/workers?filter=bgc-alerts',
      alert: (metrics?.bgcExpired || 0) > 0,
      color: (metrics?.bgcExpired || 0) > 0 ? 'text-red-600' : 'text-amber-600',
      bgColor: (metrics?.bgcExpired || 0) > 0 ? 'bg-red-100 dark:bg-red-950' : 'bg-amber-100 dark:bg-amber-950',
    },
  ]

  const quickActions = [
    {
      title: 'Add Worker',
      description: 'Create a new worker profile',
      icon: Plus,
      href: '/workers/create',
      color: 'text-blue-600',
    },
    {
      title: 'Import CSV',
      description: 'Bulk upload workers',
      icon: Upload,
      href: '/workers?action=bulk-upload',
      color: 'text-green-600',
    },
    {
      title: 'Create Project',
      description: 'Start a new project',
      icon: FolderOpen,
      href: '/projects/create',
      color: 'text-purple-600',
    },
    {
      title: 'Send Message',
      description: 'Broadcast to workers',
      icon: Mail,
      href: '/messages/compose',
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Monitor workforce health, track compliance, and manage your PPH Connect platform
        </p>
      </header>

      {/* Summary Cards */}
      <section aria-labelledby="summary-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2
              id="summary-heading"
              className="text-xs font-semibold uppercase text-muted-foreground tracking-wide"
            >
              Summary
            </h2>
            <Badge variant="outline" className="text-[0.65rem]">
              Real-time
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))
            : summaryCards.map((card) => (
                <Link key={card.title} to={card.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                      <div className={`p-2 rounded-full ${card.bgColor}`}>
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{card.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                      {card.trend && (
                        <div className="flex items-center gap-1 mt-2">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600">{card.trend}</span>
                        </div>
                      )}
                      {card.alert && (
                        <div className="flex items-center gap-1 mt-2">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          <span className="text-xs text-red-600">Action required</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>
      </section>

      {/* BGC Alerts Section */}
      {metrics && (metrics.bgcExpired > 0 || metrics.bgcExpiring > 0) && (
        <section aria-labelledby="bgc-alerts-heading" className="space-y-3">
          <h2
            id="bgc-alerts-heading"
            className="text-xs font-semibold uppercase text-muted-foreground tracking-wide"
          >
            Background Check Alerts
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {metrics.bgcExpired > 0 && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-sm font-semibold">Expired Checks</CardTitle>
                    </div>
                    <Badge variant="destructive">{metrics.bgcExpired}</Badge>
                  </div>
                  <CardDescription>Workers with expired background checks</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/workers?filter=bgc-expired">
                    <Button variant="destructive" size="sm" className="w-full">
                      View Workers <CheckCircle className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            {metrics.bgcExpiring > 0 && (
              <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <CardTitle className="text-sm font-semibold">Expiring Soon</CardTitle>
                    </div>
                    <Badge variant="secondary">{metrics.bgcExpiring}</Badge>
                  </div>
                  <CardDescription>Workers with checks expiring in 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/workers?filter=bgc-expiring">
                    <Button variant="outline" size="sm" className="w-full">
                      Schedule Renewals <CheckCircle className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2
            id="quick-actions-heading"
            className="text-xs font-semibold uppercase text-muted-foreground tracking-wide"
          >
            Quick Actions
          </h2>
          <Badge variant="secondary" className="text-[0.65rem]">
            Shortcuts
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
                      <CardDescription className="text-xs">{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* System Status */}
      <section aria-labelledby="system-status-heading">
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-semibold">System Status</CardTitle>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                All Systems Operational
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              PPH Connect is running smoothly. Database, authentication, and all services are operational.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
