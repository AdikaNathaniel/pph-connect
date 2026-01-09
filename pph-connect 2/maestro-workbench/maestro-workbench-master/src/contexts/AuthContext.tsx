import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { hasRole, normalizeRole } from '@/lib/auth/roles';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  logout: () => void;
  refreshSession: () => Promise<void>;
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const readProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setUser(null);
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        setError(profileError.message);
        setUser(null);
        return;
      }

      const normalizedProfile = {
        ...(profile as unknown as User),
        role: normalizeRole((profile as { role?: string | null }).role),
      };
      setUser(normalizedProfile);
      setError(null);
    } catch (profileException) {
      setError(profileException instanceof Error ? profileException.message : 'Failed to load profile');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user) {
        try {
          supabase.rpc('mark_last_sign_in').catch((rpcError) => {
            console.error('Failed to mark last sign-in:', rpcError);
          });
          await readProfile(nextSession.user.id);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data, error: getSessionError }) => {
      if (getSessionError) {
        setError(getSessionError.message);
        setIsLoading(false);
        return;
      }

      const currentSession = data.session ?? null;
      setSession(currentSession);

      if (currentSession?.user) {
        await readProfile(currentSession.user.id);
      } else {
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [readProfile]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Failed to sign out');
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        throw refreshError;
      }

      const nextSession = data.session ?? null;
      setSession(nextSession);
      if (nextSession?.user) {
        await readProfile(nextSession.user.id);
      } else {
        setUser(null);
      }
    } catch (refreshException) {
      setError(refreshException instanceof Error ? refreshException.message : 'Failed to refresh session');
    } finally {
      setIsLoading(false);
    }
  }, [readProfile]);

  useEffect(() => {
    const metadataRole = session?.user?.user_metadata?.role ?? null;
    const normalizedMetadataRole = metadataRole ? normalizeRole(metadataRole) : null;
    const normalizedUserRole = normalizeRole(user?.role ?? null);
    if (!session?.user?.id) {
      return;
    }
    if (normalizedMetadataRole === normalizedUserRole) {
      return;
    }
    supabase.auth.updateUser({ data: { role: normalizedUserRole } }).catch((metadataError) => {
      console.warn('AuthContext: failed to sync role metadata', metadataError);
    });
  }, [session?.user?.id, session?.user?.user_metadata?.role, user?.role]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    logout,
    refreshSession,
    error,
    isAuthenticated: !!user,
    isLoading,
    isAdmin: hasRole(user?.role ?? null, 'admin'),
  }), [user, session, error, isLoading, refreshSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => useAuth().user;

export const useSession = () => useAuth().session;
