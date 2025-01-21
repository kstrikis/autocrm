import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { Layout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'

export function App(): React.ReactElement {
  logger.methodEntry('App')
  const result = (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
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
      </AuthProvider>
    </ErrorBoundary>
  )
  logger.methodExit('App')
  return result
}

