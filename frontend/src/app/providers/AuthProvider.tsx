import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/auth/supabase'
import { normalizeSupabaseAuthError } from '../../lib/auth/errors'
import type { CurrentUser, UserRole } from '../../types/auth'
import { AuthContext, type AuthContextValue } from './auth-context'

const allowedRoles = new Set<UserRole>([
  'super_admin',
  'project_manager',
  'team_member',
  'client',
])

function getCurrentUser(user: User): CurrentUser {
  const metadata = user.user_metadata
  const role = metadata.role

  return {
    id: user.id,
    email: user.email ?? '',
    name:
      metadata.full_name ??
      metadata.name ??
      user.email?.split('@')[0] ??
      'CHERP User',
    role: allowedRoles.has(role) ? role : 'team_member',
    avatar_url: metadata.avatar_url,
  }
}

function getSessionUser(session: Session | null) {
  return session?.user ? getCurrentUser(session.user) : null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setCurrentUser(getSessionUser(data.session))
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(getSessionUser(session))
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) {
          throw new Error(
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
          )
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw normalizeSupabaseAuthError(error)
        }
      },
      signOut: async () => {
        await supabase.auth.signOut()
        localStorage.clear()
        sessionStorage.clear()
        setCurrentUser(null)
      },
    }),
    [currentUser, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
