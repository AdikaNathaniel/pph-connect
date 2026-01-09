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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { X, UserPlus } from 'lucide-react'
import { AssignWorkersToProjectDialog } from '@/components/features/projects/AssignWorkersToProjectDialog'

type WorkerAssignment = {
  id: string
  worker_id: string
  project_id: string
  assigned_at: string
  removed_at: string | null
  workers?: {
    id: string
    full_name: string
    email_personal: string
    status: 'active' | 'pending' | 'terminated' | 'inactive'
  }
}

type WorkersTabProps = {
  projectId: string
  projectName?: string
}

export function WorkersTab({ projectId, projectName = 'this project' }: WorkersTabProps) {
  const queryClient = useQueryClient()
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [workerToRemove, setWorkerToRemove] = useState<{ id: string; workerId: string; name: string } | null>(null)

  // Fetch worker assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['worker-assignments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_assignments')
        .select('id, worker_id, project_id, assigned_at, removed_at')
        .eq('project_id', projectId)
        .order('assigned_at', { ascending: false })

      if (error) throw error
      return data as WorkerAssignment[]
    },
  })

  // Fetch worker details separately
  const workerIds = assignments?.map((a) => a.worker_id) || []
  const { data: workers } = useQuery({
    queryKey: ['workers-for-project', workerIds],
    queryFn: async () => {
      if (workerIds.length === 0) return []

      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, email_personal, status')
        .in('id', workerIds)

      if (error) throw error
      return data
    },
    enabled: workerIds.length > 0,
  })

  // Enrich assignments with worker data
  const enrichedAssignments = assignments?.map((a) => ({
    ...a,
    workers: workers?.find((w) => w.id === a.worker_id),
  }))

  // Separate current and past assignments (based on removed_at being null or not)
  const currentAssignments = enrichedAssignments?.filter((a) => !a.removed_at) || []
  const pastAssignments = enrichedAssignments?.filter((a) => a.removed_at) || []

  // Remove worker mutation (soft delete by setting removed_at)
  const removeWorkerMutation = useMutation({
    mutationFn: async ({ assignmentId, workerId }: { assignmentId: string; workerId: string }) => {
      const { error } = await supabase
        .from('worker_assignments')
        .update({
          removed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)

      if (error) throw error
      return { workerId }
    },
    onSuccess: (_data, variables) => {
      // Invalidate project-side query
      queryClient.invalidateQueries({ queryKey: ['worker-assignments', projectId] })
      // Invalidate worker-side queries (for when viewing from worker detail page)
      queryClient.invalidateQueries({ queryKey: ['worker-assignments', variables.workerId] })
      queryClient.invalidateQueries({ queryKey: ['worker-active-project-ids', variables.workerId] })
      setWorkerToRemove(null)
    },
  })

  const handleRemoveWorker = () => {
    if (workerToRemove) {
      removeWorkerMutation.mutate({ assignmentId: workerToRemove.id, workerId: workerToRemove.workerId })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assigned Workers</CardTitle>
          <CardDescription>Workers assigned to this project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading workers...</p>
        </CardContent>
      </Card>
    )
  }

  const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    pending: 'secondary',
    terminated: 'destructive',
    inactive: 'outline',
  }

  return (
    <div className="space-y-4">
      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>{currentAssignments.length} worker(s) currently assigned</CardDescription>
            </div>
            <Button onClick={() => setAssignDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Workers
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currentAssignments.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.workers?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assignment.workers?.email_personal || '-'}
                      </TableCell>
                      <TableCell>
                        {assignment.workers && (
                          <Badge variant={statusVariants[assignment.workers.status]}>
                            {assignment.workers.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setWorkerToRemove({ id: assignment.id, workerId: assignment.worker_id, name: assignment.workers?.full_name || 'Unknown' })}
                          disabled={removeWorkerMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No workers assigned yet. Click "Assign Workers" to add workers to this project.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Past Assignments */}
      {pastAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Assignments</CardTitle>
            <CardDescription>{pastAssignments.length} worker(s) previously assigned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Removed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.workers?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assignment.workers?.email_personal || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment.removed_at ? format(new Date(assignment.removed_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Workers Dialog */}
      <AssignWorkersToProjectDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        projectId={projectId}
        projectName={projectName}
        existingWorkerIds={currentAssignments.map((a) => a.worker_id)}
      />

      {/* Remove Worker Confirmation Dialog */}
      <AlertDialog open={!!workerToRemove} onOpenChange={(open) => !open && setWorkerToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Worker from Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-medium">{workerToRemove?.name}</span> from this project?
              The worker will be soft-deleted and moved to past assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveWorker}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Worker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
