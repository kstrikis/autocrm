import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { useUser } from '@/lib/contexts/UserContext'

interface Props {
  className?: string
}

export function NavBar({ className = '' }: Props): React.ReactElement {
  logger.methodEntry('NavBar')
  const navigate = useNavigate()
  const { user, logout } = useUser()

  useEffect((): (() => void) => {
    logger.methodEntry('NavBar.useEffect')
    return () => logger.methodExit('NavBar.useEffect')
  }, [])

  const handleLogout = async (): Promise<void> => {
    logger.methodEntry('NavBar.handleLogout')
    try {
      await logout()
      void navigate('/')
      logger.methodExit('NavBar.handleLogout')
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error('Failed to logout'), 'NavBar.handleLogout')
    }
  }

  const result = (
    <nav className={`flex justify-between items-center p-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <span className="text-xl font-bold">AutoCRM</span>
        {user && (
          <span className="text-sm text-gray-600">
            Welcome, {user.name}!
          </span>
        )}
      </div>
      {user && (
        <button
          onClick={(): void => {
            void handleLogout()
          }}
          aria-label="Logout"
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Logout
        </button>
      )}
    </nav>
  )

  logger.methodExit('NavBar')
  return result
} 