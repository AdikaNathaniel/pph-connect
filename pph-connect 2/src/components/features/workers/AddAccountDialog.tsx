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
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertCircle } from 'lucide-react'

type AddAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerId: string
  workerName: string
  onSuccess?: () => void
}

type PlatformType = 'DataCompute' | 'Maestro' | 'Other'

const PLATFORM_OPTIONS: { value: PlatformType; label: string }[] = [
  { value: 'DataCompute', label: 'DataCompute' },
  { value: 'Maestro', label: 'Maestro' },
  { value: 'Other', label: 'Other' },
]

export function AddAccountDialog({
  open,
  onOpenChange,
  workerId,
  workerName,
  onSuccess,
}: AddAccountDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [platformType, setPlatformType] = useState<PlatformType | ''>('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountId, setAccountId] = useState('')

  // Fetch existing accounts to check for conflicts
  const { data: existingAccounts = [] } = useQuery({
    queryKey: ['worker-accounts', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_accounts')
        .select('platform_type, is_current')
        .eq('worker_id', workerId)
        .eq('is_current', true)

      if (error) throw error
      return data
    },
    enabled: open,
  })

  // Check if selected platform already has a current account
  const hasCurrentAccount = platformType
    ? existingAccounts.some((acc) => acc.platform_type === platformType)
    : false

  // Mutation to create account
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated')
      if (!platformType) throw new Error('Platform type is required')
      if (!accountEmail.trim()) throw new Error('Account email is required')
      if (!accountId.trim()) throw new Error('Account ID is required')

      const { error } = await supabase.from('worker_accounts').insert({
        worker_id: workerId,
        platform_type: platformType,
        worker_account_email: accountEmail.trim(),
        worker_account_id: accountId.trim(),
        is_current: true,
        status: 'active',
        activated_at: new Date().toISOString(),
        created_by: user.id,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-accounts', workerId] })
      toast({
        title: 'Success',
        description: `Added ${platformType} account for ${workerName}`,
      })
      onSuccess?.()
      handleClose()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to add account: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = () => {
    if (!platformType) return
    if (hasCurrentAccount) return
    createAccountMutation.mutate()
  }

  const handleClose = () => {
    setPlatformType('')
    setAccountEmail('')
    setAccountId('')
    onOpenChange(false)
  }

  const isFormValid = platformType && !hasCurrentAccount && accountEmail.trim() && accountId.trim()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogDescription>
            Add a new platform account for {workerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="platform-type">
              Platform Type <span className="text-destructive">*</span>
            </Label>
            <Select value={platformType} onValueChange={(value) => setPlatformType(value as PlatformType)}>
              <SelectTrigger id="platform-type">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Warning */}
          {hasCurrentAccount && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This worker already has a current {platformType} account. Please use "Replace Account" instead.
              </AlertDescription>
            </Alert>
          )}

          {/* Account Email */}
          <div className="space-y-2">
            <Label htmlFor="account-email">
              Account Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="account-email"
              type="email"
              placeholder="worker@platform.com"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              disabled={!platformType || hasCurrentAccount}
            />
            <p className="text-sm text-muted-foreground">
              Email associated with this platform account
            </p>
          </div>

          {/* Account ID */}
          <div className="space-y-2">
            <Label htmlFor="account-id">
              Account ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="account-id"
              type="text"
              placeholder="Platform-specific account identifier"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={!platformType || hasCurrentAccount}
            />
            <p className="text-sm text-muted-foreground">
              Platform-specific account identifier
            </p>
          </div>

          {/* Info Alert */}
          {!hasCurrentAccount && platformType && (
            <Alert>
              <AlertDescription className="text-sm">
                This account will be marked as the current active account for {platformType}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={createAccountMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || createAccountMutation.isPending}
          >
            {createAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
