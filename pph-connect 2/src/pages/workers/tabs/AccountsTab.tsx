import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AddAccountDialog } from '@/components/features/workers/AddAccountDialog'
import { ReplaceAccountDialog } from '@/components/features/workers/ReplaceAccountDialog'
import { format } from 'date-fns'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

type WorkerAccount = {
  id: string
  worker_id: string
  worker_account_email: string
  worker_account_id: string
  platform_type: 'DataCompute' | 'Maestro' | 'Other'
  status: 'active' | 'inactive' | 'replaced'
  is_current: boolean
  activated_at: string
  deactivated_at: string | null
  deactivation_reason: string | null
  created_at: string
  created_by: string | null
  updated_at: string
  updated_by: string | null
}

type AccountsTabProps = {
  workerId: string
  workerName?: string
}

export function AccountsTab({ workerId, workerName = 'Worker' }: AccountsTabProps) {
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [replaceAccountOpen, setReplaceAccountOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<WorkerAccount | null>(null)
  // Fetch worker accounts
  const { data: accounts, isLoading, isError, error } = useQuery({
    queryKey: ['worker-accounts', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_accounts')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as WorkerAccount[]
    },
  })

  // Get status badge variant and icon
  const getStatusInfo = (status: string | undefined | null, isCurrent: boolean) => {
    if (status === 'active' && isCurrent) {
      return {
        variant: 'default' as const,
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'ACTIVE',
      }
    } else if (status === 'replaced') {
      return {
        variant: 'secondary' as const,
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
        text: 'REPLACED',
      }
    } else if (status === 'inactive') {
      return {
        variant: 'outline' as const,
        icon: <XCircle className="h-4 w-4" />,
        text: 'INACTIVE',
      }
    } else {
      return {
        variant: 'outline' as const,
        icon: null,
        text: status?.toUpperCase() || 'UNKNOWN',
      }
    }
  }

  // Get platform badge color
  const getPlatformVariant = (platform: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      DataCompute: 'default',
      Maestro: 'secondary',
      Other: 'outline',
    }
    return variants[platform] || 'outline'
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load accounts: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  // Empty state
  if (!accounts || accounts.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No accounts yet.</p>
            <Button onClick={() => setAddAccountOpen(true)}>Add Account</Button>
          </CardContent>
        </Card>
        <AddAccountDialog
          open={addAccountOpen}
          onOpenChange={setAddAccountOpen}
          workerId={workerId}
          workerName={workerName}
          onSuccess={() => {}}
        />
      </>
    )
  }

  // Separate current and historical accounts
  const currentAccounts = accounts.filter((acc) => acc.is_current && acc.status === 'active')
  const historicalAccounts = accounts.filter((acc) => !acc.is_current || acc.status !== 'active')

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Platform Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Complete chain of custody for all platform accounts
          </p>
        </div>
        <Button variant="outline" onClick={() => setAddAccountOpen(true)}>
          Add Account
        </Button>
      </div>

      {/* Current Accounts Section */}
      {currentAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Current Accounts
            </h4>
            <Separator className="flex-1" />
          </div>

          {currentAccounts.map((account) => {
            const statusInfo = getStatusInfo(account.status, account.is_current)
            return (
              <Card
                key={account.id}
                className="border-2 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPlatformVariant(account.platform_type)}>
                          {account.platform_type}
                        </Badge>
                        <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                          {statusInfo.icon}
                          {statusInfo.text}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{account.worker_account_id}</CardTitle>
                      <CardDescription>{account.worker_account_email}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAccount(account)
                        setReplaceAccountOpen(true)
                      }}
                    >
                      Replace
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-muted-foreground">Activated</label>
                      <p className="font-medium">
                        {format(new Date(account.activated_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Status Duration</label>
                      <p className="font-medium">
                        {Math.floor(
                          (new Date().getTime() - new Date(account.activated_at).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Historical Accounts Section */}
      {historicalAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Account History
            </h4>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-3">
            {historicalAccounts.map((account) => {
              const statusInfo = getStatusInfo(account.status, account.is_current)
              return (
                <Card key={account.id} className="border-muted">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getPlatformVariant(account.platform_type)}>
                            {account.platform_type}
                          </Badge>
                          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                            {statusInfo.icon}
                            {statusInfo.text}
                          </Badge>
                        </div>
                        <CardTitle className="text-base">{account.worker_account_id}</CardTitle>
                        <CardDescription className="text-xs">
                          {account.worker_account_email}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Activated</label>
                        <p className="text-sm">
                          {format(new Date(account.activated_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Deactivated</label>
                        <p className="text-sm">
                          {account.deactivated_at
                            ? format(new Date(account.deactivated_at), 'MMM d, yyyy')
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {account.deactivation_reason && (
                      <div className="pt-2 border-t">
                        <label className="text-xs text-muted-foreground">Deactivation Reason</label>
                        <p className="text-sm mt-1">{account.deactivation_reason}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                      <span>
                        Active for{' '}
                        {Math.floor(
                          ((account.deactivated_at
                            ? new Date(account.deactivated_at).getTime()
                            : new Date().getTime()) -
                            new Date(account.activated_at).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Info box about account replacement */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Chain of Custody:</strong> All account changes are permanently recorded. When an
            account is replaced, the old account is marked as "REPLACED" and the new account becomes
            active. This ensures complete audit trail for compliance.
          </p>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddAccountDialog
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        workerId={workerId}
        workerName={workerName}
        onSuccess={() => {}}
      />
      {selectedAccount && (
        <ReplaceAccountDialog
          open={replaceAccountOpen}
          onOpenChange={setReplaceAccountOpen}
          workerId={workerId}
          workerName={workerName}
          currentAccount={selectedAccount}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}
