import React from 'react'
import { Navigate } from 'react-router-dom'
import { useUser } from '@/lib/contexts/UserContext'
import { logger } from '@/lib/logger'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props): React.ReactElement {
  logger.methodEntry('ProtectedRoute')
  const { user, isLoading } = useUser()

  if (isLoading) {
    logger.info('ProtectedRoute: Loading user state')
    return <div>Loading...</div>
  }

  if (!user) {
    logger.info('ProtectedRoute: User not authenticated, redirecting to login')
    return <Navigate to="/" replace />
  }

  logger.methodExit('ProtectedRoute')
  return <>{children}</>
} 