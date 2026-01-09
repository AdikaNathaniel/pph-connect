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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'

type WorkerAccount = {
  id: string
  platform_type: 'DataCompute' | 'Maestro' | 'Other'
  worker_account_email: string | null
  worker_account_id: string | null
  is_current: boolean
  status: string
  activated_at: string | null
}

type ReplaceAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerId: string
  workerName: string
  currentAccount: WorkerAccount
  onSuccess?: () => void
}

const DEACTIVATION_REASONS = [
  { value: 'platform_policy_violation', label: 'Platform Policy Violation' },
  { value: 'worker_request', label: 'Worker Request' },
  { value: 'security_breach', label: 'Security Breach' },
  { value: 'account_suspension', label: 'Account Suspension' },
  { value: 'performance_issues', label: 'Performance Issues' },
  { value: 'migration', label: 'Migration to New Account' },
  { value: 'other', label: 'Other' },
]

export function ReplaceAccountDialog({
  open,
  onOpenChange,
  workerId,
  workerName,
  currentAccount,
  onSuccess,
}: ReplaceAccountDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [deactivationReason, setDeactivationReason] = useState('')
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountId, setNewAccountId] = useState('')

  // Mutation to replace account (deactivate old + create new)
  const replaceAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated')
      if (!deactivationReason) throw new Error('Deactivation reason is required')
      if (!newAccountEmail.trim()) throw new Error('New account email is required')
      if (!newAccountId.trim()) throw new Error('New account ID is required')

      // Step 1: Deactivate current account (mark as replaced)
      const { error: deactivateError } = await supabase
        .from('worker_accounts')
        .update({
          is_current: false,
          status: 'replaced',
          deactivated_at: new Date().toISOString(),
          deactivation_reason: deactivationReason,
          updated_by: user.id,
        })
        .eq('id', currentAccount.id)

      if (deactivateError) throw deactivateError

      // Step 2: Create new account
      const { error: createError } = await supabase.from('worker_accounts').insert({
        worker_id: workerId,
        platform_type: currentAccount.platform_type,
        worker_account_email: newAccountEmail.trim(),
        worker_account_id: newAccountId.trim(),
        is_current: true,
        status: 'active',
        activated_at: new Date().toISOString(),
        created_by: user.id,
      })

      if (createError) throw createError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-accounts', workerId] })
      toast({
        title: 'Success',
        description: `Replaced ${currentAccount.platform_type} account for ${workerName}`,
      })
      onSuccess?.()
      handleClose()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to replace account: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = () => {
    if (!deactivationReason) return
    replaceAccountMutation.mutate()
  }

  const handleClose = () => {
    setDeactivationReason('')
    setNewAccountEmail('')
    setNewAccountId('')
    onOpenChange(false)
  }

  const isFormValid = deactivationReason && newAccountEmail.trim() && newAccountId.trim()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Replace Account</DialogTitle>
          <DialogDescription>
            Deactivate the current {currentAccount.platform_type} account and create a new one for {workerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Account (Read-only) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Current Account</Label>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Platform</p>
                  <p className="text-sm">{currentAccount.platform_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Email</p>
                  <p className="text-sm">{currentAccount.worker_account_email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account ID</p>
                  <p className="text-sm">{currentAccount.worker_account_id || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activated</p>
                  <p className="text-sm">
                    {currentAccount.activated_at
                      ? new Date(currentAccount.activated_at).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Deactivation Reason */}
          <div className="space-y-2">
            <Label htmlFor="deactivation-reason">
              Deactivation Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={deactivationReason} onValueChange={setDeactivationReason}>
              <SelectTrigger id="deactivation-reason">
                <SelectValue placeholder="Select reason for deactivation" />
              </SelectTrigger>
              <SelectContent>
                {DEACTIVATION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divider with Arrow */}
          <div className="flex items-center justify-center py-2">
            <div className="flex-1 border-t" />
            <ArrowRight className="mx-4 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 border-t" />
          </div>

          {/* New Account Details */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">New Account</Label>
            <div className="space-y-4 rounded-lg border bg-background p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Platform</p>
                <Badge variant="outline">{currentAccount.platform_type}</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-account-email">
                  New Account Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-account-email"
                  type="email"
                  placeholder="worker@platform.com"
                  value={newAccountEmail}
                  onChange={(e) => setNewAccountEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Email for the new platform account
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-account-id">
                  New Account ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-account-id"
                  type="text"
                  placeholder="Platform-specific account identifier"
                  value={newAccountId}
                  onChange={(e) => setNewAccountId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Platform-specific account identifier
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action will permanently deactivate the current account. The account history will be preserved for audit purposes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={replaceAccountMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || replaceAccountMutation.isPending}
            variant="destructive"
          >
            {replaceAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Replace Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
