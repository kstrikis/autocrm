import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface UserContextType {
  user: User | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: React.ReactNode
}

export function UserProvider({ children }: UserProviderProps): React.ReactElement {
  logger.methodEntry('UserProvider')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    logger.methodEntry('UserProvider.authEffect')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoading(false)
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
        })
      } else {
        setUser(null)
      }
    })
    logger.methodExit('UserProvider.authEffect')
    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    logger.methodEntry('UserProvider.login')
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
      
      if (data.user) {
        setUser({
          id: data.user.id,
          name: data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
        })
      }
    } catch (error) {
      logger.error('Login failed', { error })
      throw error
    }
    logger.methodExit('UserProvider.login')
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    logger.methodEntry('UserProvider.logout')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error) {
      logger.error('Logout failed', { error })
      throw error
    }
    logger.methodExit('UserProvider.logout')
  }, [])

  const value = {
    user,
    login,
    logout,
    isLoading
  }

  const result = (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )

  logger.methodExit('UserProvider')
  return result
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 