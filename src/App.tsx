import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { Layout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { AuthCallback } from '@/pages/auth/callback'
import { SettingsPage } from '@/pages/SettingsPage'
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
              
              {/* Auth routes - redirect to dashboard if already logged in */}
              <Route element={<AuthGuard />}>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
              </Route>

              {/* Protected routes - require authentication */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
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

