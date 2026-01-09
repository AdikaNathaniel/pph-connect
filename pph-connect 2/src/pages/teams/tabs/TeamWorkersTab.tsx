import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  email_personal: string
  status: 'pending' | 'active' | 'inactive' | 'terminated'
  worker_role: string | null
  hire_date: string
}

type TeamWorkersTabProps = {
  teamId: string
  teamName: string
}

export function TeamWorkersTab({ teamId, teamName }: TeamWorkersTabProps) {
  const navigate = useNavigate()

  // Fetch workers assigned to this team through project assignments
  // Path: teams → project_teams → workforce_projects → worker_assignments → workers
  const { data: workers, isLoading, isError, error } = useQuery({
    queryKey: ['team-workers', teamId],
    queryFn: async () => {
      // First get all projects assigned to this team
      const { data: projectTeams, error: projectTeamsError } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('team_id', teamId)

      if (projectTeamsError) throw projectTeamsError
      if (!projectTeams || projectTeams.length === 0) return []

      const projectIds = projectTeams.map((pt) => pt.project_id)

      // Then get all active worker assignments for those projects
      const { data: assignments, error: assignmentsError } = await supabase
        .from('worker_assignments')
        .select(`
          worker_id,
          workers (
            id,
            hr_id,
            full_name,
            email_personal,
            status,
            worker_role,
            hire_date
          )
        `)
        .in('project_id', projectIds)
        .is('removed_at', null)

      if (assignmentsError) throw assignmentsError
      if (!assignments) return []

      // Deduplicate workers (a worker might be on multiple projects for this team)
      const workerMap = new Map<string, Worker>()
      assignments.forEach((assignment) => {
        if (assignment.workers && !workerMap.has(assignment.workers.id)) {
          workerMap.set(assignment.workers.id, assignment.workers as Worker)
        }
      })

      // Sort by full_name
      return Array.from(workerMap.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      )
    },
  })

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      active: 'default',
      pending: 'secondary',
      inactive: 'outline',
      terminated: 'destructive',
    }
    return variants[status] || 'secondary'
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load workers: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  // Empty state
  if (!workers || workers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No workers currently assigned to projects for this team.</p>
          <p className="text-sm text-muted-foreground">
            Workers appear here when they are assigned to projects that this team works on.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Active vs inactive workers
  const activeWorkers = workers.filter((w) => w.status === 'active' || w.status === 'pending')
  const inactiveWorkers = workers.filter((w) => w.status === 'inactive' || w.status === 'terminated')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Workers on Team Projects</h3>
        <p className="text-sm text-muted-foreground">
          {workers.length} worker{workers.length !== 1 ? 's' : ''} on projects assigned to {teamName}
          {' '}({activeWorkers.length} active)
        </p>
      </div>

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Workers
          </CardTitle>
          <CardDescription>
            Workers assigned to projects this team works on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HR ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.hr_id}</TableCell>
                  <TableCell>{worker.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {worker.email_personal}
                  </TableCell>
                  <TableCell className="text-sm">
                    {worker.worker_role || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(worker.status)}>
                      {worker.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(worker.hire_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/workers/${worker.id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkers.length}</div>
            <p className="text-xs text-muted-foreground">Currently active or pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inactive Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveWorkers.length}</div>
            <p className="text-xs text-muted-foreground">Inactive or terminated</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
