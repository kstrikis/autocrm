import React from 'react'
import { Outlet } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { NavBar } from './NavBar'

interface Props {
  children?: React.ReactNode
}

export function Layout({ children }: Props): React.ReactElement {
  logger.methodEntry('Layout')
  const result = (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
    </div>
  )
  logger.methodExit('Layout')
  return result
} 