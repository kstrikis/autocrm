import React from 'react'
import { Navigate } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { useAuth } from '@/contexts/AuthContext'

export function LandingPage(): React.ReactElement {
  logger.methodEntry('LandingPage')
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (user) {
    logger.methodExit('LandingPage');
    return <Navigate to="/dashboard" replace />
  }

  // Redirect to auth page if not logged in
  logger.methodExit('LandingPage');
  return <Navigate to="/auth" replace />
} 