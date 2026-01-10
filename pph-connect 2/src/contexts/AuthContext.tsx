import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export type UserRole = 'root' | 'admin' | 'manager' | 'team_lead' | 'worker'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  department_id: string | null
  suspended: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  // Role check helpers
  isRoot: boolean
  isAdmin: boolean
  isManager: boolean
  isTeamLead: boolean
  isWorker: boolean
  isAdminOrAbove: boolean
  isManagerOrAbove: boolean
  isTeamLeadOrAbove: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, department_id, suspended')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
        return
      }

      setProfile(data as UserProfile)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  // Role check helpers
  const isRoot = profile?.role === 'root'
  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager'
  const isTeamLead = profile?.role === 'team_lead'
  const isWorker = profile?.role === 'worker'
  const isAdminOrAbove = isRoot || isAdmin
  const isManagerOrAbove = isAdminOrAbove || isManager
  const isTeamLeadOrAbove = isManagerOrAbove || isTeamLead

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile,
    isRoot,
    isAdmin,
    isManager,
    isTeamLead,
    isWorker,
    isAdminOrAbove,
    isManagerOrAbove,
    isTeamLeadOrAbove,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
