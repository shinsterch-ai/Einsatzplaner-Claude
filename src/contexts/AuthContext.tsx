'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'
import { resolveOrgLogoUrl } from '@/lib/org-logo'

type AppRole = Database['public']['Enums']['app_role']

interface Profile {
  id: string
  email: string
  full_name: string | null
  organization_id: string | null
  is_active: boolean
  must_change_password: boolean
}

interface Organization {
  id: string
  name: string
  code: string
  logo_url: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  organization: Organization | null
  roles: AppRole[]
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  signup: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  hasRole: (roles: AppRole[]) => boolean
  isSuperadmin: boolean
  isOrgAdmin: boolean
  isPlaner: boolean
  isMitarbeiter: boolean
  mustChangePassword: boolean
  clearMustChangePassword: () => void
  refreshOrganization: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0)
        } else {
          setProfile(null)
          setOrganization(null)
          setRoles([])
          setIsLoading(false)
        }
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session?.user) setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profileError && profileData) {
        setProfile(profileData)
        if (profileData.organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id, name, code, logo_url')
            .eq('id', profileData.organization_id)
            .single()
          if (!orgError && orgData) {
            const signedLogo = await resolveOrgLogoUrl(orgData.logo_url)
            setOrganization({ ...orgData, logo_url: signedLogo })
          }
        } else {
          setOrganization(null)
        }
      }

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      setRoles(rolesData?.map(r => r.role) ?? [])
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials'))
          return { error: 'Ungültige E-Mail oder Passwort' }
        return { error: error.message }
      }
      return { error: null }
    } catch {
      return { error: 'Ein unerwarteter Fehler ist aufgetreten' }
    }
  }

  const signup = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      })
      if (error) {
        if (error.message.includes('User already registered'))
          return { error: 'Diese E-Mail-Adresse ist bereits registriert' }
        return { error: error.message }
      }
      return { error: null }
    } catch {
      return { error: 'Ein unerwarteter Fehler ist aufgetreten' }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setOrganization(null)
    setRoles([])
  }

  const hasRole = (checkRoles: AppRole[]): boolean => {
    if (!user || roles.length === 0) return false
    return checkRoles.some(role => roles.includes(role))
  }

  const isSuperadmin = hasRole(['superadmin'])
  const isOrgAdmin = hasRole(['admin'])
  const isPlaner = hasRole(['planer'])
  const isMitarbeiter = hasRole(['mitarbeiter'])
  const mustChangePassword = profile?.must_change_password ?? false

  const clearMustChangePassword = () => {
    if (profile) setProfile({ ...profile, must_change_password: false })
  }

  const refreshOrganization = async () => {
    if (!profile?.organization_id) return
    const { data: orgData, error } = await supabase
      .from('organizations')
      .select('id, name, code, logo_url')
      .eq('id', profile.organization_id)
      .single()
    if (!error && orgData) {
      const signedLogo = await resolveOrgLogoUrl(orgData.logo_url)
      setOrganization({ ...orgData, logo_url: signedLogo })
    }
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, organization, roles, isLoading,
      isAuthenticated: !!user,
      login, signup, logout, hasRole,
      isSuperadmin, isOrgAdmin, isPlaner, isMitarbeiter,
      mustChangePassword, clearMustChangePassword, refreshOrganization,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
