import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useUserManagement } from '@/hooks/useUserManagement';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole } from '@/lib/auth/roles';

const formatTimestamp = (value: string) => {
  if (!value) {
    return '—';
  }
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
};

export const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = hasRole(user?.role ?? null, 'admin');
  const {
    users,
    isLoading,
    error,
    refresh,
    availableRoles,
    handleRoleChange,
    handleToggleStatus,
    savingRoleId,
    togglingStatusId,
  } = useUserManagement();

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restricted</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage users. Please contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">User management</h1>
          <p className="text-sm text-muted-foreground">
            Administer platform access, assign roles, and deactivate accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="overflow-x-auto">
                  <Table data-testid="user-management-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Assign Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        Loading users…
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div>{user.fullName}</div>
                          <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}</p>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(nextRole) => handleRoleChange(user.id, nextRole as typeof user.role)}
                            disabled={savingRoleId === user.id}
                          >
                            <SelectTrigger
                              className="w-[160px]"
                              data-testid="user-management-role-select"
                              disabled={!canManage || savingRoleId === user.id}
                            >
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.suspended ? 'destructive' : 'outline'}>
                            {user.suspended ? 'Suspended' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTimestamp(user.updatedAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={!user.suspended}
                              onCheckedChange={(checked) => handleToggleStatus(user.id, !checked)}
                              disabled={!canManage || togglingStatusId === user.id}
                              data-testid="user-management-activation-toggle"
                            />
                                <span className="text-xs text-muted-foreground">
                                  {user.suspended ? 'Activate User' : 'Deactivate User'}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;
