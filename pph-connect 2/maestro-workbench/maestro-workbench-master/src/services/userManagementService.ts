import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/lib/auth/roles';
import { normalizeRole } from '@/lib/auth/roles';

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  suspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, suspended, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email ?? '',
    fullName: row.full_name ?? 'Unnamed user',
    role: normalizeRole(row.role ?? null),
    suspended: Boolean(row.suspended),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }));
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role: role })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  try {
    await supabase.auth.admin.updateUser({
      id: userId,
      user_metadata: { role },
    });
  } catch (adminError) {
    console.warn('userManagementService: failed to sync auth metadata role', adminError);
  }
}

export async function toggleUserStatus(userId: string, suspended: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ suspended: suspended })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  try {
    await supabase.auth.admin.updateUser({
      id: userId,
      user_metadata: { suspended },
    });
  } catch (adminError) {
    console.warn('userManagementService: failed to sync suspended metadata', adminError);
  }
}
