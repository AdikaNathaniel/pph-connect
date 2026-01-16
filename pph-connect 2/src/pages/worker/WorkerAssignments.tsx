import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { format } from 'date-fns'
import {
  FolderOpen,
  AlertCircle,
  Calendar,
  ExternalLink,
  Building2,
  Clock,
  Users,
} from 'lucide-react'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  email_personal: string
  email_pph: string | null
}

type WorkerAssignment = {
  id: string
  assigned_at: string
  removed_at: string | null
  project: {
    id: string
    project_name: string
    project_code: string
    status: string
    start_date: string | null
    end_date: string | null
    department: {
      id: string
      department_name: string
    } | null
  } | null
}

export function WorkerAssignments() {
  const { user } = useAuth()

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

  // Fetch worker's project assignments with project details
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['my-assignments', linkedWorker?.id],
    queryFn: async () => {
      if (!linkedWorker?.id) return []

      const { data, error } = await supabase
        .from('worker_assignments')
        .select(`
          id,
          assigned_at,
          removed_at,
          project:workforce_projects(
            id,
            project_name,
            project_code,
            status,
            start_date,
            end_date,
            department:departments(id, department_name)
          )
        `)
        .eq('worker_id', linkedWorker.id)
        .order('assigned_at', { ascending: false })

      if (error) throw error
      return data as WorkerAssignment[]
    },
    enabled: !!linkedWorker?.id,
  })

  // Separate active and past assignments
  const activeAssignments = assignments?.filter(a => !a.removed_at && a.project?.status === 'active') || []
  const completedAssignments = assignments?.filter(a => a.removed_at || a.project?.status !== 'active') || []

  // Open Maestro workbench for task completion
  const openMaestroWorkbench = (projectCode: string) => {
    // This URL would be configured based on actual Maestro integration
    const maestroUrl = `https://maestro.example.com/workbench?project=${projectCode}`
    window.open(maestroUrl, '_blank')
  }

  if (isLoadingWorker) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
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
        <h1 className="text-3xl font-bold">My Assignments</h1>
        <p className="text-muted-foreground">
          View your current and past project assignments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAssignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently assigned projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedAssignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Past assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-green-600" />
            Active Assignments
          </CardTitle>
          <CardDescription>Projects you are currently working on</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAssignments ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : activeAssignments.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {assignment.project?.project_name || 'Unknown Project'}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {assignment.project?.project_code || '-'}
                      </p>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      Active
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mt-3">
                    {assignment.project?.department && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{assignment.project.department.department_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Assigned: {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {assignment.project?.start_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Project started: {format(new Date(assignment.project.start_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openMaestroWorkbench(assignment.project?.project_code || '')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Maestro Workbench
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active assignments</p>
              <p className="text-sm text-muted-foreground">
                You are not currently assigned to any active projects.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Assignments */}
      {completedAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Past Assignments
            </CardTitle>
            <CardDescription>Previously completed project assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 border rounded-lg bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {assignment.project?.project_name || 'Unknown Project'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {assignment.project?.project_code || '-'}
                        {assignment.project?.department && (
                          <span> &middot; {assignment.project.department.department_name}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {assignment.removed_at ? 'Removed' : assignment.project?.status || 'Completed'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {assignment.removed_at
                          ? `Ended: ${format(new Date(assignment.removed_at), 'MMM d, yyyy')}`
                          : `Assigned: ${format(new Date(assignment.assigned_at), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default WorkerAssignments
