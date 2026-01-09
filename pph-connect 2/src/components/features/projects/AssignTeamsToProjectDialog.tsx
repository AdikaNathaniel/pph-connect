import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Users } from 'lucide-react'

type Team = {
  id: string
  team_name: string
  locale_primary: string
  locale_secondary: string | null
  locale_region: string | null
  is_active: boolean
  department: {
    department_name: string
  } | null
}

type AssignTeamsToProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  existingTeamIds: string[]
}

export function AssignTeamsToProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  existingTeamIds,
}: AssignTeamsToProjectDialogProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fetch all active teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          team_name,
          locale_primary,
          locale_secondary,
          locale_region,
          is_active,
          department:departments(department_name)
        `)
        .eq('is_active', true)
        .order('team_name')

      if (error) throw error
      return data as Team[]
    },
    enabled: open,
  })

  // Filter out already assigned teams and apply search
  const availableTeams = teams?.filter((team) => {
    const notAssigned = !existingTeamIds.includes(team.id)
    const matchesSearch =
      searchQuery === '' ||
      team.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.locale_primary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.department?.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return notAssigned && matchesSearch
  })

  // Assign teams mutation
  const assignMutation = useMutation({
    mutationFn: async (teamIds: string[]) => {
      const assignments = teamIds.map((teamId) => ({
        project_id: projectId,
        team_id: teamId,
        created_by: user?.id || null,
      }))

      const { error } = await supabase.from('project_teams').insert(assignments)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-teams', projectId] })
      queryClient.invalidateQueries({ queryKey: ['teams-for-project'] })
      setSelectedTeamIds([])
      setSearchQuery('')
      setError(null)
      onOpenChange(false)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to assign teams')
    },
  })

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  const handleSelectAll = () => {
    if (availableTeams) {
      setSelectedTeamIds(availableTeams.map((t) => t.id))
    }
  }

  const handleDeselectAll = () => {
    setSelectedTeamIds([])
  }

  const handleAssign = () => {
    if (selectedTeamIds.length === 0) return
    setError(null)
    assignMutation.mutate(selectedTeamIds)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedTeamIds([])
      setSearchQuery('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Teams to Project</DialogTitle>
          <DialogDescription>
            Select teams to assign to <span className="font-medium">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams by name, locale, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedTeamIds.length} of {availableTeams?.length || 0} teams selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
        </div>

        {/* Teams list */}
        <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] max-h-[400px]">
          {teamsLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : availableTeams && availableTeams.length > 0 ? (
            <div className="divide-y">
              {availableTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggleTeam(team.id)}
                >
                  <Checkbox
                    checked={selectedTeamIds.includes(team.id)}
                    onCheckedChange={() => handleToggleTeam(team.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{team.team_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {team.department?.department_name || 'No department'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{team.locale_primary}</Badge>
                    {team.locale_region && (
                      <Badge variant="secondary">{team.locale_region}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {teams && teams.length > 0 ? (
                <p>No available teams match your search, or all teams are already assigned.</p>
              ) : (
                <p>No active teams found. Create teams first before assigning to projects.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedTeamIds.length === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {selectedTeamIds.length} Team{selectedTeamIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
