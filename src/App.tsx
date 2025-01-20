import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { Layout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { Toaster } from '@/components/ui/toaster'
import { UserProvider } from '@/lib/contexts/UserContext'

export function App(): React.ReactElement {
  logger.methodEntry('App')
  const result = (
    <ErrorBoundary>
      <UserProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </UserProvider>
    </ErrorBoundary>
  )
  logger.methodExit('App')
  return result
}

