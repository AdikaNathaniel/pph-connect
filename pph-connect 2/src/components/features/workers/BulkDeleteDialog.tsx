import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { AlertTriangle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  status: 'pending' | 'active' | 'inactive' | 'terminated'
}

type BulkDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workers: Worker[]
  onSuccess: () => void
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  workers,
  onSuccess,
}: BulkDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated')

      const workerIds = workers.map((w) => w.id)

      if (workerIds.length === 0) {
        throw new Error('No workers selected')
      }

      // Soft delete by setting status to terminated
      // Database constraint: workers_status_requirements_check
      // - terminated: rtw_datetime AND termination_date both SET

      // Update workers that already have rtw_datetime
      const { error: error1, data: data1 } = await supabase
        .from('workers')
        .update({
          status: 'terminated',
          termination_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .in('id', workerIds)
        .not('rtw_datetime', 'is', null)
        .select('id')

      if (error1) throw error1

      // Update workers that don't have rtw_datetime (set both dates)
      const { error: error2, data: data2 } = await supabase
        .from('workers')
        .update({
          status: 'terminated',
          rtw_datetime: new Date().toISOString(),
          termination_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .in('id', workerIds)
        .is('rtw_datetime', null)
        .select('id')

      if (error2) throw error2

      // Return count for success message
      return { updated: (data1?.length || 0) + (data2?.length || 0) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      toast({
        title: 'Workers deleted',
        description: `Successfully deleted ${workers.length} worker${workers.length !== 1 ? 's' : ''}`,
      })
      onSuccess()
      onOpenChange(false)
      setConfirmText('')
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleDelete = () => {
    if (confirmText !== 'DELETE') return
    if (workers.length === 0) {
      toast({
        title: 'No workers selected',
        description: 'Please select workers to delete',
        variant: 'destructive',
      })
      return
    }
    deleteMutation.mutate()
  }

  const activeWorkers = workers.filter((w) => w.status === 'active')
  const hasActiveWorkers = activeWorkers.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Workers
          </DialogTitle>
          <DialogDescription>
            This will mark {workers.length} worker{workers.length !== 1 ? 's' : ''} as terminated.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning for active workers */}
          {hasActiveWorkers && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> {activeWorkers.length} of the selected workers{' '}
                {activeWorkers.length === 1 ? 'is' : 'are'} currently active. Deleting active
                workers may impact ongoing projects.
              </AlertDescription>
            </Alert>
          )}

          {/* Workers list */}
          <div className="border rounded-md max-h-[200px] overflow-y-auto">
            <div className="p-3 space-y-2">
              {workers.slice(0, 10).map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted"
                >
                  <div>
                    <div className="font-medium">{worker.full_name}</div>
                    <div className="text-xs text-muted-foreground">{worker.hr_id}</div>
                  </div>
                  <div
                    className={
                      worker.status === 'active'
                        ? 'text-green-600 text-xs font-medium'
                        : 'text-muted-foreground text-xs'
                    }
                  >
                    {worker.status}
                  </div>
                </div>
              ))}
              {workers.length > 10 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  ...and {workers.length - 10} more
                </div>
              )}
            </div>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="text-sm font-medium">
              Type <span className="font-mono bg-muted px-1">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 border rounded-md"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Note:</strong> This performs a "soft delete" by setting the status to
              terminated and recording the termination date. Worker records are never permanently
              deleted from the database for audit trail purposes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : `Delete ${workers.length} Worker${workers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
