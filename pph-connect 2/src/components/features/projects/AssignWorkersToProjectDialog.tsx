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
import { Loader2, Search, UserPlus } from 'lucide-react'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  email_personal: string
  status: 'active' | 'pending' | 'inactive' | 'terminated'
  locale_primary: string
}

type AssignWorkersToProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  existingWorkerIds: string[]
}

export function AssignWorkersToProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  existingWorkerIds,
}: AssignWorkersToProjectDialogProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fetch all active workers
  const { data: workers, isLoading: workersLoading } = useQuery({
    queryKey: ['workers-for-project-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, hr_id, full_name, email_personal, status, locale_primary')
        .in('status', ['active', 'pending'])
        .order('full_name')

      if (error) throw error
      return data as Worker[]
    },
    enabled: open,
  })

  // Filter out already assigned workers and apply search
  const availableWorkers = workers?.filter((worker) => {
    const notAssigned = !existingWorkerIds.includes(worker.id)
    const matchesSearch =
      searchQuery === '' ||
      worker.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.hr_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.email_personal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.locale_primary.toLowerCase().includes(searchQuery.toLowerCase())
    return notAssigned && matchesSearch
  })

  // Assign workers mutation
  const assignMutation = useMutation({
    mutationFn: async (workerIds: string[]) => {
      const assignments = workerIds.map((workerId) => ({
        project_id: projectId,
        worker_id: workerId,
        assigned_at: new Date().toISOString(),
        assigned_by: user?.id || null,
      }))

      const { data, error } = await supabase
        .from('worker_assignments')
        .insert(assignments)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate project-side queries
      queryClient.invalidateQueries({ queryKey: ['worker-assignments', projectId] })
      // Invalidate worker-side queries for each assigned worker
      variables.forEach((workerId) => {
        queryClient.invalidateQueries({ queryKey: ['worker-assignments', workerId] })
        queryClient.invalidateQueries({ queryKey: ['worker-active-project-ids', workerId] })
      })
      setSelectedWorkerIds([])
      setSearchQuery('')
      setError(null)
      onOpenChange(false)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to assign workers')
    },
  })

  const handleToggleWorker = (workerId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    )
  }

  const handleSelectAll = () => {
    if (availableWorkers) {
      setSelectedWorkerIds(availableWorkers.map((w) => w.id))
    }
  }

  const handleDeselectAll = () => {
    setSelectedWorkerIds([])
  }

  const handleAssign = () => {
    if (selectedWorkerIds.length === 0) return
    setError(null)
    assignMutation.mutate(selectedWorkerIds)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedWorkerIds([])
      setSearchQuery('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    pending: 'secondary',
    inactive: 'outline',
    terminated: 'destructive',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Workers to Project</DialogTitle>
          <DialogDescription>
            Select workers to assign to <span className="font-medium">{projectName}</span>
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
            placeholder="Search workers by name, HR ID, email, or locale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedWorkerIds.length} of {availableWorkers?.length || 0} workers selected
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

        {/* Workers list */}
        <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] max-h-[400px]">
          {workersLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : availableWorkers && availableWorkers.length > 0 ? (
            <div className="divide-y">
              {availableWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggleWorker(worker.id)}
                >
                  <Checkbox
                    checked={selectedWorkerIds.includes(worker.id)}
                    onCheckedChange={() => handleToggleWorker(worker.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{worker.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {worker.hr_id} • {worker.email_personal}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariants[worker.status]}>{worker.status}</Badge>
                    <Badge variant="outline">{worker.locale_primary}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {workers && workers.length > 0 ? (
                <p>No available workers match your search, or all workers are already assigned.</p>
              ) : (
                <p>No active workers found.</p>
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
            disabled={selectedWorkerIds.length === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {selectedWorkerIds.length} Worker{selectedWorkerIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
