import React from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    logger.methodEntry('ErrorBoundary.getDerivedStateFromError')
    logger.error('Error caught by boundary', { error })
    const result = { hasError: true, error }
    logger.methodExit('ErrorBoundary.getDerivedStateFromError')
    return result
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.methodEntry('ErrorBoundary.componentDidCatch')
    logger.error('Component error details', { error, errorInfo })
    logger.methodExit('ErrorBoundary.componentDidCatch')
  }

  render(): React.ReactElement {
    logger.methodEntry('ErrorBoundary.render')
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-600">{this.state.error?.message}</p>
        </div>
      )
    }

    logger.methodExit('ErrorBoundary.render')
    return <>{this.props.children}</>
  }
} 