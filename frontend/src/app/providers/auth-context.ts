import { createContext } from 'react'
import type { CurrentUser } from '../../types/auth'

export type AuthContextValue = {
  currentUser: CurrentUser | null
  isLoading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
