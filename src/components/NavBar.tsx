import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

interface Props {
  className?: string
}

export function NavBar({ className = '' }: Props): React.ReactElement {
  logger.methodEntry('NavBar')
  const navigate = useNavigate()
  const { user, loading, signOut } = useAuth()

  useEffect((): (() => void) => {
    logger.methodEntry('NavBar.useEffect')
    return () => logger.methodExit('NavBar.useEffect')
  }, [])

  const handleLogout = async (): Promise<void> => {
    logger.methodEntry('NavBar.handleLogout')
    try {
      await signOut()
      void navigate('/auth')
      logger.methodExit('NavBar.handleLogout')
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error('Failed to logout'), 'NavBar.handleLogout')
    }
  }

  const result = (
    <nav className={`flex justify-between items-center p-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <span className="text-xl font-bold">AutoCRM</span>
        {!loading && user && (
          <span className="text-sm text-gray-600" data-testid="welcome-message">
            Welcome, {user.user_metadata?.full_name || user.email}!
          </span>
        )}
      </div>
      {!loading && user && (
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="text-gray-600 hover:text-gray-900"
          >
            Settings
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleLogout()}
            className="text-sm"
          >
            Logout
          </Button>
        </div>
      )}
    </nav>
  )

  logger.methodExit('NavBar')
  return result
}