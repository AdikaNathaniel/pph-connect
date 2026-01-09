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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Users } from 'lucide-react'

type Worker = {
  id: string
  hr_id: string
  full_name: string
}

type Project = {
  id: string
  project_code: string
  project_name: string
  department: {
    department_name: string
  }
}

type BulkAssignToProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workers: Worker[]
  onSuccess?: () => void
}

export function BulkAssignToProjectDialog({
  open,
  onOpenChange,
  workers,
  onSuccess,
}: BulkAssignToProjectDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [selectedProject, setSelectedProject] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Fetch all active projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['available-projects', departmentFilter],
    queryFn: async () => {
      let query = supabase
        .from('workforce_projects')
        .select(
          `
          id,
          project_code,
          project_name,
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
        .order('department_name', { ascending: true})

      if (error) throw error
      return data
    },
    enabled: open,
  })

  // Mutation to assign workers
  const assignMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!user) throw new Error('User not authenticated')

      const assignments = workers.map((worker) => ({
        worker_id: worker.id,
        project_id: projectId,
        assigned_at: new Date().toISOString(),
        assigned_by: user.id,
      }))

      const { error } = await supabase.from('worker_assignments').insert(assignments)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      toast({
        title: 'Success',
        description: `Assigned ${workers.length} worker(s) to project`,
      })
      onSuccess?.()
      handleClose()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to assign workers: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const handleAssign = () => {
    if (!selectedProject) return
    assignMutation.mutate(selectedProject)
  }

  const handleClose = () => {
    setSelectedProject('')
    setDepartmentFilter('all')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Assign to Project</DialogTitle>
          <DialogDescription>
            Assign {workers.length} selected worker{workers.length !== 1 ? 's' : ''} to a project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Worker Count */}
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {workers.length} worker{workers.length !== 1 ? 's' : ''} selected
            </span>
          </div>

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
            <Label htmlFor="project">Select Project</Label>
            {projectsLoading ? (
              <div className="h-10 border rounded-md animate-pulse bg-muted" />
            ) : (
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.project_code}</span>
                        <span className="text-muted-foreground">—</span>
                        <span>{project.project_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {projects && projects.length === 0 && (
              <p className="text-sm text-muted-foreground">No active projects available</p>
            )}
          </div>

          {/* Warning about duplicates */}
          <Alert>
            <AlertDescription className="text-sm">
              Workers already assigned to the selected project will be skipped. This prevents duplicate assignments.
            </AlertDescription>
          </Alert>

          {/* Worker Preview */}
          {workers.length <= 5 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Selected Workers</Label>
              <div className="space-y-1 text-sm text-muted-foreground">
                {workers.map((worker) => (
                  <div key={worker.id}>
                    {worker.full_name} ({worker.hr_id})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProject || assignMutation.isPending}
          >
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {workers.length} Worker{workers.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
