import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { X, Users } from 'lucide-react'
import { AssignTeamsToProjectDialog } from '@/components/features/projects/AssignTeamsToProjectDialog'

type ProjectTeam = {
  id: string
  team_id: string
  project_id: string
  created_at: string
  teams?: {
    id: string
    team_name: string
    locale_primary: string
  }
}

type TeamsTabProps = {
  projectId: string
  projectName?: string
}

export function TeamsTab({ projectId, projectName = 'this project' }: TeamsTabProps) {
  const queryClient = useQueryClient()
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [teamToRemove, setTeamToRemove] = useState<{ id: string; name: string } | null>(null)

  // Fetch assigned teams
  const { data: projectTeams, isLoading } = useQuery({
    queryKey: ['project-teams', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_teams')
        .select('id, team_id, project_id, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ProjectTeam[]
    },
  })

  // Fetch team details separately to avoid join issues
  const teamIds = projectTeams?.map((pt) => pt.team_id) || []
  const { data: teams } = useQuery({
    queryKey: ['teams-for-project', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return []

      const { data, error } = await supabase
        .from('teams')
        .select('id, team_name, locale_primary')
        .in('id', teamIds)

      if (error) throw error
      return data
    },
    enabled: teamIds.length > 0,
  })

  // Enrich project teams with team data
  const enrichedProjectTeams = projectTeams?.map((pt) => ({
    ...pt,
    teams: teams?.find((t) => t.id === pt.team_id),
  }))

  // Remove team mutation
  const removeTeamMutation = useMutation({
    mutationFn: async (projectTeamId: string) => {
      const { error } = await supabase.from('project_teams').delete().eq('id', projectTeamId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-teams', projectId] })
      setTeamToRemove(null)
    },
  })

  const handleRemoveTeam = () => {
    if (teamToRemove) {
      removeTeamMutation.mutate(teamToRemove.id)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assigned Teams</CardTitle>
          <CardDescription>Teams assigned to this project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading teams...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assigned Teams</CardTitle>
              <CardDescription>
                {enrichedProjectTeams?.length || 0} team(s) assigned to this project
              </CardDescription>
            </div>
            <Button onClick={() => setAssignDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Assign Teams
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enrichedProjectTeams && enrichedProjectTeams.length > 0 ? (
            <div className="space-y-3">
              {enrichedProjectTeams.map((projectTeam) => (
                <div
                  key={projectTeam.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <p className="font-medium">{projectTeam.teams?.team_name || 'Unknown Team'}</p>
                      <p className="text-sm text-muted-foreground">
                        Assigned on {format(new Date(projectTeam.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {projectTeam.teams?.locale_primary && (
                      <Badge variant="outline">{projectTeam.teams.locale_primary}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTeamToRemove({ id: projectTeam.id, name: projectTeam.teams?.team_name || 'Unknown Team' })}
                    disabled={removeTeamMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No teams assigned yet. Click "Assign Teams" to add teams to this project.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Assign Teams Dialog */}
      <AssignTeamsToProjectDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        projectId={projectId}
        projectName={projectName}
        existingTeamIds={projectTeams?.map((pt) => pt.team_id) || []}
      />

      {/* Remove Team Confirmation Dialog */}
      <AlertDialog open={!!teamToRemove} onOpenChange={(open) => !open && setTeamToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team from Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-medium">{teamToRemove?.name}</span> from this project?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
