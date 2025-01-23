import React from 'react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export function LoadingSpinner({ 
  className, 
  size = 'md', 
  fullScreen = false 
}: LoadingSpinnerProps): React.ReactElement {
  logger.methodEntry('LoadingSpinner')

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const containerClasses = cn(
    'flex items-center justify-center',
    fullScreen && 'fixed inset-0 bg-background/80 backdrop-blur-sm',
    className
  )

  const spinnerClasses = cn(
    'animate-spin rounded-full border-4 border-primary border-t-transparent',
    sizeClasses[size]
  )

  const result = (
    <div className={containerClasses}>
      <div className={spinnerClasses} role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )

  logger.methodExit('LoadingSpinner')
  return result
} 