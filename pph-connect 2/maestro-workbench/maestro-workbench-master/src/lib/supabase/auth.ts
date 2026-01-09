import supabase from '../../integrations/supabase/client.ts';

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const resetPassword = (email: string) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo:
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
  });

export const getCurrentUser = () => supabase.auth.getUser();

export const getSession = () => supabase.auth.getSession();
