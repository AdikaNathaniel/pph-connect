import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Loader2, AlertCircle } from 'lucide-react'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  status: 'pending' | 'active' | 'inactive' | 'terminated'
}

type BulkStatusUpdateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workers: Worker[]
  onSuccess?: () => void
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', variant: 'secondary' as const },
  { value: 'active', label: 'Active', variant: 'default' as const },
  { value: 'inactive', label: 'Inactive', variant: 'outline' as const },
  { value: 'terminated', label: 'Terminated', variant: 'destructive' as const },
]

export function BulkStatusUpdateDialog({
  open,
  onOpenChange,
  workers,
  onSuccess,
}: BulkStatusUpdateDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = useState<string>('')

  // Mutation to update status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: 'pending' | 'active' | 'inactive' | 'terminated') => {
      if (!user) throw new Error('User not authenticated')

      const workerIds = workers.map((w) => w.id)

      // Build update payload based on status requirements
      // Database constraint: workers_status_requirements_check
      // - pending: rtw_datetime = NULL, termination_date = NULL
      // - active/inactive: rtw_datetime SET, termination_date = NULL
      // - terminated: rtw_datetime AND termination_date both SET
      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }

      if (status === 'pending') {
        updatePayload.rtw_datetime = null
        updatePayload.termination_date = null

        const { error } = await supabase
          .from('workers')
          .update(updatePayload)
          .in('id', workerIds)

        if (error) throw error
      } else if (status === 'active' || status === 'inactive') {
        // For active/inactive: need rtw_datetime set, termination_date null
        // Update workers that already have rtw_datetime
        const { error: error1 } = await supabase
          .from('workers')
          .update({
            ...updatePayload,
            termination_date: null,
          })
          .in('id', workerIds)
          .not('rtw_datetime', 'is', null)

        if (error1) throw error1

        // Update workers that don't have rtw_datetime (set it to now)
        const { error: error2 } = await supabase
          .from('workers')
          .update({
            ...updatePayload,
            rtw_datetime: new Date().toISOString(),
            termination_date: null,
          })
          .in('id', workerIds)
          .is('rtw_datetime', null)

        if (error2) throw error2
      } else if (status === 'terminated') {
        // For terminated: need both rtw_datetime and termination_date set
        // Update workers that already have rtw_datetime
        const { error: error1 } = await supabase
          .from('workers')
          .update({
            ...updatePayload,
            termination_date: new Date().toISOString().split('T')[0],
          })
          .in('id', workerIds)
          .not('rtw_datetime', 'is', null)

        if (error1) throw error1

        // Update workers that don't have rtw_datetime (set both dates)
        const { error: error2 } = await supabase
          .from('workers')
          .update({
            ...updatePayload,
            rtw_datetime: new Date().toISOString(),
            termination_date: new Date().toISOString().split('T')[0],
          })
          .in('id', workerIds)
          .is('rtw_datetime', null)

        if (error2) throw error2
      }

      return { count: workerIds.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      toast({
        title: 'Success',
        description: `Updated status for ${data.count} worker(s)`,
      })
      onSuccess?.()
      handleClose()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = () => {
    if (!newStatus) return
    updateStatusMutation.mutate(newStatus as any)
  }

  const handleClose = () => {
    setNewStatus('')
    onOpenChange(false)
  }

  // Group workers by current status
  const statusCounts = workers.reduce((acc, worker) => {
    acc[worker.status] = (acc[worker.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Status Update</DialogTitle>
          <DialogDescription>
            Update the status for {workers.length} selected worker{workers.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status Summary */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Current Status Distribution</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => {
                const statusOption = STATUS_OPTIONS.find((opt) => opt.value === status)
                return (
                  <Badge key={status} variant={statusOption?.variant || 'secondary'}>
                    {count} {statusOption?.label || status}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="new-status">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status-specific warnings */}
          {newStatus === 'terminated' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Setting status to "Terminated" will mark {workers.length} worker{workers.length !== 1 ? 's' : ''} as terminated and record today as the termination date.
              </AlertDescription>
            </Alert>
          )}

          {(newStatus === 'active' || newStatus === 'inactive') && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Setting status to "{newStatus}" will set the Right to Work date to today for workers who don't have one, and clear any termination date.
              </AlertDescription>
            </Alert>
          )}

          {newStatus === 'pending' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Setting status to "Pending" will clear the Right to Work date and termination date for these workers.
              </AlertDescription>
            </Alert>
          )}

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
          <Button variant="outline" onClick={handleClose} disabled={updateStatusMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newStatus || updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update {workers.length} Worker{workers.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
