import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw } from 'lucide-react'

type UserProfile = {
  id: string
  email: string
  full_name: string
  role: 'root' | 'admin' | 'manager' | 'team_lead' | 'worker'
  suspended: boolean
  updated_at: string
}

const AVAILABLE_ROLES = ['root', 'admin', 'manager', 'team_lead', 'worker'] as const

const formatTimestamp = (value: string | null) => {
  if (!value) return '—'
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true })
  } catch {
    return value
  }
}

const formatRoleLabel = (role: string) => {
  // Special case for 'root' -> 'Super Admin'
  if (role === 'root') return 'Super Admin'
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function UserManagement() {
  const queryClient = useQueryClient()
  const { isAdminOrAbove, isRoot, profile } = useAuth()
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null)
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null)

  // Fetch all users from profiles table
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users-management'],
    queryFn: async () => {
      console.log('Fetching users from profiles table...')
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, suspended, updated_at')
        .order('full_name', { ascending: true })

      if (error) {
        console.error('Error fetching profiles:', error)
        throw error
      }
      console.log('Fetched users:', data)
      return (data || []) as UserProfile[]
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserProfile['role'] }) => {
      setSavingRoleId(userId)
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] })
      toast.success('Role updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update role', { description: error.message })
    },
    onSettled: () => {
      setSavingRoleId(null)
    },
  })

  // Toggle suspended status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      setTogglingStatusId(userId)
      const { error } = await supabase
        .from('profiles')
        .update({ suspended, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] })
      toast.success(variables.suspended ? 'User suspended' : 'User activated')
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', { description: error.message })
    },
    onSettled: () => {
      setTogglingStatusId(null)
    },
  })

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, newRole: newRole as UserProfile['role'] })
  }

  const handleToggleStatus = (userId: string, currentSuspended: boolean) => {
    toggleStatusMutation.mutate({ userId, suspended: !currentSuspended })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>User Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Administer platform access, assign roles, and activate/deactivate users.
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">
              Failed to load users: {(error as Error).message}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              This could be due to:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-4">
              <li>Missing RLS policy for profiles table</li>
              <li>No data in the profiles table</li>
              <li>Network connection issues</li>
            </ul>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Administer platform access, assign roles, and activate/deactivate users.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap min-w-[180px]">Name</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[200px]">Email</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[160px]">Role</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[100px]">Status</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[140px]">Last Updated</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[160px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {user.full_name || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={
                            savingRoleId === user.id ||
                            !isAdminOrAbove ||
                            user.id === profile?.id // Can't change own role
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ROLES
                              .filter((role) => {
                                // Only super_admin (root) can see/assign root role
                                if (role === 'root') return isRoot
                                return true
                              })
                              .map((role) => (
                                <SelectItem key={role} value={role}>
                                  {formatRoleLabel(role)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={user.suspended ? 'destructive' : 'outline'}>
                          {user.suspended ? 'Suspended' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTimestamp(user.updated_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={!user.suspended}
                            onCheckedChange={() => handleToggleStatus(user.id, user.suspended)}
                            disabled={
                              togglingStatusId === user.id ||
                              !isAdminOrAbove ||
                              user.id === profile?.id // Can't suspend yourself
                            }
                          />
                          <span className="text-xs text-muted-foreground w-[70px]">
                            {user.suspended ? 'Activate' : 'Deactivate'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserManagement
