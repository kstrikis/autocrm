import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'customer' | 'service_rep' | 'admin'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): React.ReactElement {
  logger.methodEntry('ProtectedRoute')
  const { user, loading } = useAuth()

  if (loading) {
    logger.info('ProtectedRoute: Loading user state')
    return <div>Loading...</div>
  }

  if (!user) {
    logger.info('ProtectedRoute: User not authenticated, redirecting to login')
    return <Navigate to="/" replace />
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