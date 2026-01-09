import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listUsers, toggleUserStatus, updateUserRole, type ManagedUser } from '@/services/userManagementService';
import { ROLE_HIERARCHY, hasRole, type UserRole } from '@/lib/auth/roles';
import { toast } from 'sonner';

export interface UseUserManagementState {
  users: ManagedUser[];
  isLoading: boolean;
  error: string | null;
  savingRoleId: string | null;
  togglingStatusId: string | null;
  refresh: () => Promise<void>;
  handleRoleChange: (userId: string, role: UserRole) => Promise<void>;
  handleToggleStatus: (userId: string, nextSuspended: boolean) => Promise<void>;
  availableRoles: readonly string[];
}

export function useUserManagement(): UseUserManagementState {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const { user } = useAuth();
  const canManage = hasRole(user?.role ?? null, 'admin');

  const loadUsers = useCallback(async () => {
    if (!canManage) {
      setError('Insufficient permissions');
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (loadError) {
      console.error('useUserManagement: failed to load users', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadUsers().catch((unexpected) => console.error('useUserManagement: load error', unexpected));
  }, [loadUsers]);

  const handleRoleChange = useCallback(
    async (userId: string, role: UserRole) => {
      if (!canManage) {
        toast.error('Insufficient permissions');
        return;
      }
      setSavingRoleId(userId);
      try {
        await updateUserRole(userId, role);
        toast.success('Role updated');
        await loadUsers();
      } catch (updateError) {
        console.error('useUserManagement: failed to update role', updateError);
        toast.error('Unable to update role');
      } finally {
        setSavingRoleId(null);
      }
    },
    [canManage, loadUsers]
  );

  const handleToggleStatus = useCallback(
    async (userId: string, nextSuspended: boolean) => {
      if (!canManage) {
        toast.error('Insufficient permissions');
        return;
      }
      setTogglingStatusId(userId);
      try {
        await toggleUserStatus(userId, nextSuspended);
        toast.success(nextSuspended ? 'User deactivated' : 'User activated');
        await loadUsers();
      } catch (toggleError) {
        console.error('useUserManagement: failed to toggle status', toggleError);
        toast.error('Unable to update status');
      } finally {
        setTogglingStatusId(null);
      }
    },
    [canManage, loadUsers]
  );

  return {
    users,
    isLoading,
    error,
    savingRoleId,
    togglingStatusId,
    refresh: loadUsers,
    handleRoleChange,
    handleToggleStatus,
    availableRoles: ROLE_HIERARCHY,
  };
}
