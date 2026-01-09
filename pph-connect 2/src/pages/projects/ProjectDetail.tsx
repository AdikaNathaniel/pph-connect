import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { TeamsTab } from './tabs/TeamsTab'
import { WorkersTab } from './tabs/WorkersTab'

type Project = {
  id: string
  project_code: string
  project_name: string
  department_id: string
  expert_tier: 'tier0' | 'tier1' | 'tier2'
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string | null
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const hash = location.hash.replace('#', '') || 'overview'
  const [activeTab, setActiveTab] = useState(hash)

  // Fetch project data
  const { data: project, isLoading, isError, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) throw new Error('Project ID is required')

      const { data, error } = await supabase
        .from('workforce_projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Project
    },
    enabled: !!id,
  })

  // Fetch department name
  const { data: department } = useQuery({
    queryKey: ['department', project?.department_id],
    queryFn: async () => {
      if (!project?.department_id) return null

      const { data, error } = await supabase
        .from('departments')
        .select('department_name')
        .eq('id', project.department_id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!project?.department_id,
  })

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    navigate(`#${value}`, { replace: true })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (isError || !project) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || 'Project not found'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    paused: 'secondary',
    completed: 'outline',
    cancelled: 'destructive',
  }

  const tierVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    tier0: 'outline',
    tier1: 'secondary',
    tier2: 'default',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.project_name}</h1>
              <Badge variant={statusVariants[project.status]}>{project.status}</Badge>
              <Badge variant={tierVariants[project.expert_tier]}>{project.expert_tier.toUpperCase()}</Badge>
            </div>
            <p className="text-muted-foreground">
              Project Code: <span className="font-medium">{project.project_code}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/projects/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Basic details about this project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Project Code</p>
                  <p className="text-base font-medium">{project.project_code}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                  <p className="text-base font-medium">{project.project_name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-base">{department?.department_name || 'Loading...'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Expert Tier</p>
                  <Badge variant={tierVariants[project.expert_tier]}>{project.expert_tier.toUpperCase()}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={statusVariants[project.status]}>{project.status}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-base">
                    {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '-'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-base">
                    {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : '-'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p className="text-base">{format(new Date(project.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <TeamsTab projectId={id!} projectName={project.project_name} />
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4">
          <WorkersTab projectId={id!} projectName={project.project_name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
