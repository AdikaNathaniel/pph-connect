import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { FolderOpen, CheckCircle, XCircle } from 'lucide-react'
import { AssignToProjectDialog } from '@/components/features/workers/AssignToProjectDialog'

type Team = {
  id: string
  team_name: string
}

type ProjectTeam = {
  team: Team
}

type WorkerAssignment = {
  id: string
  worker_id: string
  project_id: string
  assigned_at: string
  assigned_by: string | null
  removed_at: string | null
  removed_by: string | null
  project?: {
    id: string
    project_code: string
    project_name: string
    status: 'active' | 'paused' | 'completed' | 'cancelled'
    expert_tier: 'tier0' | 'tier1' | 'tier2'
    project_teams?: ProjectTeam[]
  }
  assigned_by_profile?: {
    full_name: string
  }
  removed_by_profile?: {
    full_name: string
  }
}

type ProjectsTabProps = {
  workerId: string
  workerName?: string
}

export function ProjectsTab({ workerId, workerName = 'Worker' }: ProjectsTabProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  // Fetch worker assignments
  const { data: assignments, isLoading, isError, error } = useQuery({
    queryKey: ['worker-assignments', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_assignments')
        .select(`
          *,
          project:workforce_projects(
            id,
            project_code,
            project_name,
            status,
            expert_tier,
            project_teams(
              team:teams(id, team_name)
            )
          ),
          assigned_by_profile:profiles!assigned_by(full_name),
          removed_by_profile:profiles!removed_by(full_name)
        `)
        .eq('worker_id', workerId)
        .order('assigned_at', { ascending: false })

      if (error) throw error
      return data as WorkerAssignment[]
    },
  })

  // Get project status badge variant
  const getProjectStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      paused: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    }
    return variants[status] || 'outline'
  }

  // Get assignment status
  const getAssignmentStatus = (assignment: WorkerAssignment) => {
    if (assignment.removed_at) {
      return {
        text: 'REMOVED',
        variant: 'outline' as const,
        icon: <XCircle className="h-4 w-4 text-gray-500" />,
      }
    } else {
      return {
        text: 'ACTIVE',
        variant: 'default' as const,
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      }
    }
  }

  // Safe date formatting helper
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr), 'MMM d, yyyy')
    } catch {
      return '—'
    }
  }

  // Calculate days on assignment
  const getDaysOnAssignment = (assignment: WorkerAssignment) => {
    if (!assignment.assigned_at) return 0
    try {
      const endDate = assignment.removed_at ? new Date(assignment.removed_at) : new Date()
      const startDate = new Date(assignment.assigned_at)
      return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    } catch {
      return 0
    }
  }

  // Get team names from project assignment
  const getTeamNames = (assignment: WorkerAssignment): string[] => {
    return assignment.project?.project_teams
      ?.map((pt) => pt.team?.team_name)
      .filter((name): name is string => !!name) || []
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load project assignments: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  // Empty state
  if (!assignments || assignments.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Not assigned to any projects yet.</p>
            <Button onClick={() => setAssignDialogOpen(true)}>Assign to Project</Button>
          </CardContent>
        </Card>

        <AssignToProjectDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          workerId={workerId}
          workerName={workerName}
        />
      </>
    )
  }

  // Separate current and past assignments
  const currentAssignments = assignments.filter((a) => !a.removed_at)
  const pastAssignments = assignments.filter((a) => a.removed_at)

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Project Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Current and historical project assignments
          </p>
        </div>
        <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
          Assign to Project
        </Button>
      </div>

      {/* Current Assignments Section */}
      {currentAssignments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Current Assignments ({currentAssignments.length})
            </h4>
            <Separator className="flex-1" />
          </div>

          <Card className="border-2 border-green-200 dark:border-green-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Code</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Days Active</TableHead>
                  <TableHead>Assigned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAssignments.map((assignment) => {
                  const teamNames = getTeamNames(assignment)
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.project?.project_code || '—'}
                      </TableCell>
                      <TableCell>{assignment.project?.project_name || '—'}</TableCell>
                      <TableCell>
                        {teamNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teamNames.map((name) => (
                              <Badge key={name} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.project?.status ? (
                          <Badge variant={getProjectStatusVariant(assignment.project.status)}>
                            {assignment.project.status}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {assignment.project?.expert_tier ? (
                          <Badge variant="outline">{assignment.project.expert_tier}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {formatDate(assignment.assigned_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getDaysOnAssignment(assignment)} days
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assignment.assigned_by_profile?.full_name || 'System'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Past Assignments Section */}
      {pastAssignments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Past Assignments ({pastAssignments.length})
            </h4>
            <Separator className="flex-1" />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Code</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Removed Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Removed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastAssignments.map((assignment) => {
                  const teamNames = getTeamNames(assignment)
                  return (
                    <TableRow key={assignment.id} className="text-muted-foreground">
                      <TableCell className="font-medium">
                        {assignment.project?.project_code || '—'}
                      </TableCell>
                      <TableCell>{assignment.project?.project_name || '—'}</TableCell>
                      <TableCell>
                        {teamNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teamNames.map((name) => (
                              <Badge key={name} variant="secondary" className="text-xs opacity-70">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="opacity-70">
                          removed
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(assignment.assigned_at)}
                      </TableCell>
                      <TableCell>
                        {formatDate(assignment.removed_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getDaysOnAssignment(assignment)} days</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment.removed_by_profile?.full_name || 'System'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Summary Statistics */}
      {assignments.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-sm">Assignment Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Total Assignments</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{currentAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Currently Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(
                    assignments.reduce((sum, a) => sum + getDaysOnAssignment(a), 0) /
                      assignments.length
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Avg. Days per Assignment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign to Project Dialog */}
      <AssignToProjectDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        workerId={workerId}
        workerName={workerName}
      />
    </div>
  )
}
