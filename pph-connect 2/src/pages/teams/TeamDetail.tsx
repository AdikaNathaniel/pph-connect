import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { OverviewTab } from './tabs/OverviewTab'
import { TeamProjectsTab } from './tabs/TeamProjectsTab'
import { TeamWorkersTab } from './tabs/TeamWorkersTab'

type Team = {
  id: string
  team_name: string
  department_id: string
  locale_primary: string
  locale_secondary: string | null
  locale_region: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  department?: {
    id: string
    department_name: string
  }
}

export function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Get active tab from URL hash (e.g., #projects)
  const hash = location.hash.replace('#', '') || 'overview'

  // Fetch team data with relationships
  const { data: team, isLoading, isError, error } = useQuery({
    queryKey: ['team', id],
    queryFn: async () => {
      if (!id) throw new Error('Team ID is required')

      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          department:departments(id, department_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Team
    },
    enabled: !!id,
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (isError || !team) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load team: {error?.message || 'Team not found'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate('/teams')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/teams')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>

        {/* Team Name and Status */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{team.team_name}</h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>{team.department?.department_name || 'No department'}</span>
              <span>•</span>
              <span>Primary Locale: {team.locale_primary}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={team.is_active ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {team.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/teams/${id}/edit`)}
          >
            Edit Team
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={hash} onValueChange={(value) => navigate(`#${value}`)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab team={team} />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <TeamProjectsTab teamId={team.id} teamName={team.team_name} />
        </TabsContent>

        <TabsContent value="workers" className="mt-6">
          <TeamWorkersTab teamId={team.id} teamName={team.team_name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
