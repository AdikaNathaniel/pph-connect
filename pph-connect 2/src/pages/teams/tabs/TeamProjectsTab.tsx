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
import { Briefcase, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Project = {
  id: string
  project_code: string
  project_name: string
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
}

type TeamProjectsTabProps = {
  teamId: string
  teamName: string
}

export function TeamProjectsTab({ teamId, teamName }: TeamProjectsTabProps) {
  const navigate = useNavigate()

  // Fetch projects assigned to this team via project_teams junction table
  const { data: projects, isLoading, isError, error } = useQuery({
    queryKey: ['team-projects', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_teams')
        .select(`
          project:workforce_projects(
            id,
            project_code,
            project_name,
            status,
            start_date,
            end_date
          )
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Extract projects from the nested structure
      return data
        .map((item: any) => item.project)
        .filter(Boolean) as Project[]
    },
  })

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      active: 'default',
      planning: 'secondary',
      paused: 'outline',
      completed: 'outline',
      cancelled: 'destructive',
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
          Failed to load projects: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  // Empty state
  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No projects assigned to this team yet.</p>
          <p className="text-sm text-muted-foreground">
            Teams are assigned to projects through the project management interface.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Projects</h3>
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? 's' : ''} assigned to {teamName}
        </p>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Assigned Projects
          </CardTitle>
          <CardDescription>
            Projects that this team is currently working on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Code</TableHead>
                <TableHead>Project Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.project_code}</TableCell>
                  <TableCell>{project.project_name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(project.status)}>
                      {project.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {project.end_date
                      ? new Date(project.end_date).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/projects/${project.id}`)}
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
    </div>
  )
}
