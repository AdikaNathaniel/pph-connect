import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { FolderOpen, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

type Project = {
  id: string
  project_code: string
  project_name: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  expert_tier: 'tier0' | 'tier1' | 'tier2'
  department: {
    department_name: string
  }
}

type AssignToProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerId: string
  workerName: string
}

export function AssignToProjectDialog({
  open,
  onOpenChange,
  workerId,
  workerName,
}: AssignToProjectDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Fetch current assignments (active only) - use distinct key to avoid conflicts
  const { data: currentAssignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['worker-active-project-ids', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_assignments')
        .select('project_id')
        .eq('worker_id', workerId)
        .is('removed_at', null)

      if (error) throw error
      return data.map((a) => a.project_id)
    },
    enabled: open,
    staleTime: 0, // Always refetch when dialog opens
  })

  // Fetch all active projects
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery({
    queryKey: ['available-projects', departmentFilter],
    queryFn: async () => {
      let query = supabase
        .from('workforce_projects')
        .select(
          `
          id,
          project_code,
          project_name,
          status,
          expert_tier,
          department:departments(department_name)
        `
        )
        .in('status', ['active', 'paused'])
        .order('project_code', { ascending: true })

      if (departmentFilter !== 'all') {
        query = query.eq('department_id', departmentFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Project[]
    },
    enabled: open,
  })

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_name')
        .eq('is_active', true)
        .order('department_name', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: open,
  })

  // Mutation to assign workers
  const assignMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      if (!user) throw new Error('User not authenticated')

      // Filter out projects that already have active assignments (extra safety check)
      const projectsToAssign = projectIds.filter((id) => !currentAssignments.includes(id))

      if (projectsToAssign.length === 0) {
        throw new Error('All selected projects are already assigned to this worker')
      }

      const assignments = projectsToAssign.map((projectId) => ({
        worker_id: workerId,
        project_id: projectId,
        assigned_at: new Date().toISOString(),
        assigned_by: user.id,
      }))

      const { data, error } = await supabase
        .from('worker_assignments')
        .insert(assignments)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate worker-side queries
      queryClient.invalidateQueries({ queryKey: ['worker-assignments', workerId] })
      queryClient.invalidateQueries({ queryKey: ['worker-active-project-ids', workerId] })
      // Invalidate project-side queries for each assigned project
      variables.forEach((projectId) => {
        queryClient.invalidateQueries({ queryKey: ['worker-assignments', projectId] })
      })
      toast({
        title: 'Success',
        description: `Assigned ${workerName} to ${variables.length} project(s)`,
      })
      setSelectedProjects([])
      onOpenChange(false)
    },
    onError: (error: Error) => {
      // Refetch to update the available projects list
      refetchAssignments()

      // Check if it's a unique constraint violation
      const isConstraintError = error.message.includes('unique') ||
                                error.message.includes('duplicate') ||
                                error.message.includes('23505')

      toast({
        title: 'Error',
        description: isConstraintError
          ? 'Some projects are already assigned. The list has been refreshed.'
          : `Failed to assign worker: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // Filter out already assigned projects
  const availableProjects =
    projects?.filter((p) => !currentAssignments.includes(p.id)) || []

  // Handle project selection
  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    )
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedProjects.length === availableProjects.length) {
      setSelectedProjects([])
    } else {
      setSelectedProjects(availableProjects.map((p) => p.id))
    }
  }

  // Handle submit
  const handleAssign = () => {
    if (selectedProjects.length === 0) return
    assignMutation.mutate(selectedProjects)
  }

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedProjects([])
      setDepartmentFilter('all')
    }
    onOpenChange(open)
  }

  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      paused: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    }
    return variants[status] || 'outline'
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign Worker to Projects</DialogTitle>
          <DialogDescription>
            Select projects to assign <span className="font-semibold">{workerName}</span> to. Only
            active and paused projects are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Department Filter */}
          <div className="space-y-2">
            <Label>Filter by Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Available Projects</Label>
              {availableProjects.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 text-xs"
                >
                  {selectedProjects.length === availableProjects.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              )}
            </div>

            {/* Loading State */}
            {projectsLoading && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {/* Error State */}
            {projectsError && (
              <Alert variant="destructive">
                <AlertDescription>Failed to load projects. Please try again.</AlertDescription>
              </Alert>
            )}

            {/* Empty State */}
            {!projectsLoading && availableProjects.length === 0 && (
              <div className="border rounded-lg p-8 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {currentAssignments.length > 0
                    ? 'All available projects have been assigned to this worker.'
                    : 'No active or paused projects available.'}
                </p>
              </div>
            )}

            {/* Project List */}
            {!projectsLoading && availableProjects.length > 0 && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {availableProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => toggleProject(project.id)}
                    >
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{project.project_code}</span>
                          <Badge variant={getStatusVariant(project.status)} className="text-xs">
                            {project.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {project.expert_tier}
                          </Badge>
                        </div>
                        <p className="text-sm">{project.project_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.department.department_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Selection Summary */}
            {selectedProjects.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{selectedProjects.length}</Badge>
                <span>
                  project{selectedProjects.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedProjects.length === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {selectedProjects.length > 0 && `(${selectedProjects.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
