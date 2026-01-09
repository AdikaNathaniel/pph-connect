import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import {
  Clock,
  UserPlus,
  Edit,
  Briefcase,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

type ActivityTabProps = {
  workerId: string
  workerName: string
}

type WorkerAssignment = {
  id: string
  project_id: string
  assigned_at: string
  removed_at: string | null
  assigned_by: string | null
  removed_by: string | null
  project: {
    project_code: string
    project_name: string
  }
  assigner?: {
    id: string
    email: string
  }
}

type WorkerAccount = {
  id: string
  platform_type: string
  status: string
  is_current: boolean
  activated_at: string
  deactivated_at: string | null
  deactivation_reason: string | null
  created_at: string
}

export function ActivityTab({ workerId, workerName }: ActivityTabProps) {
  // Fetch worker assignments (project history)
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['worker-activity-assignments', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_assignments')
        .select(`
          id,
          project_id,
          assigned_at,
          removed_at,
          assigned_by,
          removed_by,
          project:workforce_projects(project_code, project_name)
        `)
        .eq('worker_id', workerId)
        .order('assigned_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as WorkerAssignment[]
    },
  })

  // Fetch worker account history
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['worker-activity-accounts', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_accounts')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as WorkerAccount[]
    },
  })

  // Combine and sort all activities
  const activities = []

  // Add assignment activities
  if (assignments) {
    assignments.forEach((assignment) => {
      activities.push({
        type: 'assignment',
        timestamp: assignment.assigned_at,
        action: 'assigned',
        data: assignment,
      })
      if (assignment.removed_at) {
        activities.push({
          type: 'assignment',
          timestamp: assignment.removed_at,
          action: 'removed',
          data: assignment,
        })
      }
    })
  }

  // Add account activities
  if (accounts) {
    accounts.forEach((account) => {
      activities.push({
        type: 'account',
        timestamp: account.activated_at || account.created_at,
        action: 'account_created',
        data: account,
      })
      if (account.deactivated_at) {
        activities.push({
          type: 'account',
          timestamp: account.deactivated_at,
          action: 'account_deactivated',
          data: account,
        })
      }
    })
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const isLoading = assignmentsLoading || accountsLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No activity history yet.</p>
          <p className="text-sm text-muted-foreground">
            Activity will appear here as {workerName} is assigned to projects or accounts are managed.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getActivityIcon = (activity: any) => {
    switch (activity.action) {
      case 'assigned':
        return <Briefcase className="h-4 w-4" />
      case 'removed':
        return <Briefcase className="h-4 w-4" />
      case 'account_created':
        return <UserPlus className="h-4 w-4" />
      case 'account_deactivated':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Edit className="h-4 w-4" />
    }
  }

  const getActivityColor = (activity: any) => {
    switch (activity.action) {
      case 'assigned':
        return 'text-green-600'
      case 'removed':
        return 'text-orange-600'
      case 'account_created':
        return 'text-blue-600'
      case 'account_deactivated':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getActivityDescription = (activity: any) => {
    switch (activity.action) {
      case 'assigned':
        return (
          <>
            Assigned to project{' '}
            <span className="font-medium">
              {activity.data.project?.project_code} - {activity.data.project?.project_name}
            </span>
          </>
        )
      case 'removed':
        return (
          <>
            Removed from project{' '}
            <span className="font-medium">
              {activity.data.project?.project_code} - {activity.data.project?.project_name}
            </span>
          </>
        )
      case 'account_created':
        return (
          <>
            <span className="font-medium">{activity.data.platform_type}</span> account created
          </>
        )
      case 'account_deactivated':
        return (
          <>
            <span className="font-medium">{activity.data.platform_type}</span> account deactivated
            {activity.data.deactivation_reason && (
              <span className="text-muted-foreground">
                {' '}
                ({activity.data.deactivation_reason.replace(/_/g, ' ')})
              </span>
            )}
          </>
        )
      default:
        return 'Activity'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Activity Timeline</h3>
        <p className="text-sm text-muted-foreground">
          Recent activity and changes for {workerName}
        </p>
      </div>

      {/* Note about audit fields */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Note:</strong> User attribution (who made changes) will be available once the database
          migration for audit fields is applied. Currently showing timestamps and actions only.
        </AlertDescription>
      </Alert>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Showing last {activities.length} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {activities.map((activity, index) => (
              <div key={`${activity.type}-${activity.timestamp}-${index}`}>
                <div className="flex gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full p-2 ${getActivityColor(activity)} bg-background border-2`}>
                      {getActivityIcon(activity)}
                    </div>
                    {index < activities.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-2" style={{ minHeight: '2rem' }} />
                    )}
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm">
                          {getActivityDescription(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'MMMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge
                        variant={
                          activity.action === 'assigned' || activity.action === 'account_created'
                            ? 'default'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {activity.action.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Project assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments?.filter(a => !a.removed_at).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Platform Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total accounts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
