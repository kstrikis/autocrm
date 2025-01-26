import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'customer' | 'service_rep' | 'admin'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): React.ReactElement {
  logger.methodEntry('ProtectedRoute')
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />
  }

  if (!user) {
    logger.info('ProtectedRoute: User not authenticated, redirecting to auth')
    return <Navigate to="/auth" replace />
  }

  if (requiredRole) {
    const userRole = user.user_metadata.role
    if (userRole !== requiredRole) {
      logger.warn('ProtectedRoute: User does not have required role', { required: requiredRole, actual: userRole })
      return <Navigate to="/dashboard" replace />
    }
  }

  logger.methodExit('ProtectedRoute')
  return <>{children}</>
} 