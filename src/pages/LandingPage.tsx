import React from 'react'
import { useNavigate } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { UserForm } from '@/components/UserForm'
import { useUser } from '@/lib/contexts/UserContext'

export function LandingPage(): React.ReactElement {
  logger.methodEntry('LandingPage')
  const navigate = useNavigate()
  const { login } = useUser()

  const handleSubmit = async (data: { email: string; password: string }): Promise<void> => {
    logger.methodEntry('LandingPage.handleSubmit')
    try {
      await login(data)
      void navigate('/dashboard')
    } catch (error) {
      logger.error('Login failed', { error })
    }
    logger.methodExit('LandingPage.handleSubmit')
  }

  const result = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to AutoCRM
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to continue
          </p>
        </div>
        <UserForm onSubmit={handleSubmit} submitText="Sign In" />
      </div>
    </div>
  )

  logger.methodExit('LandingPage')
  return result
} 