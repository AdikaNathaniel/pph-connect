import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import {
  GraduationCap,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  FileText,
  Video,
  Link as LinkIcon,
  Shield,
  Target,
  Trophy,
  ExternalLink,
} from 'lucide-react'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  email_personal: string
  email_pph: string | null
}

type TrainingModule = {
  id: string
  title: string
  description: string | null
  content: string | null
  video_url: string | null
  domain_tags: string[]
}

type TrainingAssignment = {
  id: string
  assigned_at: string
  completed_at: string | null
  status: string
  auto_assigned: boolean
  training_module: TrainingModule | null
}

type TrainingGate = {
  id: string
  gate_name: string
  status: string
  score: number | null
  attempt_count: number
  passed_at: string | null
  created_at: string
  project: {
    id: string
    name: string
  } | null
}

type TrainingMaterial = {
  id: string
  title: string
  description: string | null
  type: string
  url: string
  created_at: string
  project: {
    id: string
    name: string
  } | null
}

export function WorkerTraining() {
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

  // Fetch training module assignments
  const { data: trainingAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['my-training-assignments', linkedWorker?.id],
    queryFn: async () => {
      if (!linkedWorker?.id) return []

      const { data, error } = await supabase
        .from('worker_training_assignments')
        .select(`
          id,
          assigned_at,
          completed_at,
          status,
          auto_assigned,
          training_module:training_modules(id, title, description, content, video_url, domain_tags)
        `)
        .eq('worker_id', linkedWorker.id)
        .order('assigned_at', { ascending: false })

      if (error) throw error
      return data as TrainingAssignment[]
    },
    enabled: !!linkedWorker?.id,
  })

  // Fetch training gates (assessments)
  const { data: trainingGates, isLoading: isLoadingGates } = useQuery({
    queryKey: ['my-training-gates', linkedWorker?.id],
    queryFn: async () => {
      if (!linkedWorker?.id) return []

      const { data, error } = await supabase
        .from('training_gates')
        .select(`
          id,
          gate_name,
          status,
          score,
          attempt_count,
          passed_at,
          created_at,
          project:projects(id, name)
        `)
        .eq('worker_id', linkedWorker.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as TrainingGate[]
    },
    enabled: !!linkedWorker?.id,
  })

  // Fetch training materials available to worker (through project assignments)
  const { data: trainingMaterials, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ['my-training-materials', linkedWorker?.id],
    queryFn: async () => {
      if (!linkedWorker?.id) return []

      // First get worker's project assignments
      const { data: assignments } = await supabase
        .from('worker_assignments')
        .select('project_id')
        .eq('worker_id', linkedWorker.id)
        .is('removed_at', null)

      if (!assignments || assignments.length === 0) return []

      const projectIds = assignments.map(a => a.project_id)

      // Then get training materials for those projects
      const { data, error } = await supabase
        .from('training_materials')
        .select(`
          id,
          title,
          description,
          type,
          url,
          created_at,
          project:projects(id, name)
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as TrainingMaterial[]
    },
    enabled: !!linkedWorker?.id,
  })

  // Calculate stats
  const completedModules = trainingAssignments?.filter(a => a.status === 'completed').length || 0
  const totalModules = trainingAssignments?.length || 0
  const completionPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

  const passedGates = trainingGates?.filter(g => g.status === 'passed').length || 0
  const totalGates = trainingGates?.length || 0

  // Get material type icon
  const getMaterialIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'document':
      case 'pdf':
        return <FileText className="h-4 w-4" />
      default:
        return <LinkIcon className="h-4 w-4" />
    }
  }

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'passed':
        return 'default'
      case 'in_progress':
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Open assessment link
  const openAssessment = (gateId: string) => {
    // This URL would be configured based on actual assessment platform
    const assessmentUrl = `https://assessments.example.com/gate/${gateId}`
    window.open(assessmentUrl, '_blank')
  }

  if (isLoadingWorker) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
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
        <h1 className="text-3xl font-bold">My Training</h1>
        <p className="text-muted-foreground">
          View your training modules, materials, and gate requirements
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Progress</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionPercentage}%</div>
            <Progress value={completionPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {completedModules} of {totalModules} modules completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules Assigned</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalModules}</div>
            <p className="text-xs text-muted-foreground">
              {totalModules - completedModules} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gates Passed</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedGates}</div>
            <p className="text-xs text-muted-foreground">
              of {totalGates} total gates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materials Available</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainingMaterials?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              From your assigned projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Training Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assigned Training Modules
          </CardTitle>
          <CardDescription>Complete these modules to progress in your training</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAssignments ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : trainingAssignments && trainingAssignments.length > 0 ? (
            <div className="space-y-4">
              {trainingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {assignment.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : assignment.status === 'in_progress' ? (
                          <Play className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h4 className="font-semibold">
                          {assignment.training_module?.title || 'Unknown Module'}
                        </h4>
                      </div>
                      {assignment.training_module?.description && (
                        <p className="text-sm text-muted-foreground ml-7 mb-2">
                          {assignment.training_module.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 ml-7 text-xs text-muted-foreground">
                        <span>Assigned: {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}</span>
                        {assignment.completed_at && (
                          <span>Completed: {format(new Date(assignment.completed_at), 'MMM d, yyyy')}</span>
                        )}
                        {assignment.auto_assigned && (
                          <Badge variant="outline" className="text-xs">Auto-assigned</Badge>
                        )}
                      </div>
                      {assignment.training_module?.domain_tags && assignment.training_module.domain_tags.length > 0 && (
                        <div className="flex gap-1 ml-7 mt-2">
                          {assignment.training_module.domain_tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(assignment.status)}>
                        {assignment.status.replace('_', ' ')}
                      </Badge>
                      {assignment.status !== 'completed' && assignment.training_module?.video_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(assignment.training_module?.video_url || '', '_blank')}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No training modules assigned</p>
              <p className="text-sm text-muted-foreground">
                Training modules will appear here when assigned by your manager.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Gates (Assessments) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Gate Requirements
          </CardTitle>
          <CardDescription>Pass these assessments to unlock project access</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGates ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : trainingGates && trainingGates.length > 0 ? (
            <div className="space-y-4">
              {trainingGates.map((gate) => (
                <div
                  key={gate.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {gate.status === 'passed' ? (
                          <Trophy className="h-5 w-5 text-yellow-500" />
                        ) : gate.status === 'failed' ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Shield className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h4 className="font-semibold">{gate.gate_name}</h4>
                      </div>
                      {gate.project && (
                        <p className="text-sm text-muted-foreground ml-7">
                          Project: {gate.project.name}
                        </p>
                      )}
                      <div className="flex items-center gap-4 ml-7 mt-1 text-xs text-muted-foreground">
                        <span>Attempts: {gate.attempt_count}</span>
                        {gate.score !== null && <span>Score: {gate.score}%</span>}
                        {gate.passed_at && (
                          <span>Passed: {format(new Date(gate.passed_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(gate.status)}>
                        {gate.status}
                      </Badge>
                      {gate.status !== 'passed' && (
                        <Button
                          size="sm"
                          onClick={() => openAssessment(gate.id)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Take Assessment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No gate requirements</p>
              <p className="text-sm text-muted-foreground">
                Gate assessments will appear here when required for your projects.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Training Materials
          </CardTitle>
          <CardDescription>Resources available from your assigned projects</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMaterials ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : trainingMaterials && trainingMaterials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainingMaterials.map((material) => (
                <div
                  key={material.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => window.open(material.url, '_blank')}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded">
                      {getMaterialIcon(material.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{material.title}</h4>
                      {material.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {material.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {material.type}
                        </Badge>
                        {material.project && (
                          <span className="text-xs text-muted-foreground">
                            {material.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No training materials available</p>
              <p className="text-sm text-muted-foreground">
                Training materials from your assigned projects will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkerTraining
