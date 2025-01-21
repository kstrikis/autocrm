import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export function AuthCallback(): React.ReactElement {
  logger.methodEntry('AuthCallback')
  const navigate = useNavigate()

  useEffect(() => {
    logger.methodEntry('AuthCallback.useEffect')
    const handleCallback = async (): Promise<void> => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.hash)
        if (error) {
          logger.error(error, 'handleCallback')
          throw error
        }
        void navigate('/dashboard')
      } catch (error) {
        logger.error(error as Error, 'handleCallback')
        void navigate('/auth')
      }
    }

    void handleCallback()
    logger.methodExit('AuthCallback.useEffect')
  }, [navigate])

  logger.methodExit('AuthCallback')
  return <div>Processing authentication...</div>
} 