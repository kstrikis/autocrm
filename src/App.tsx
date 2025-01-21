import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { logger } from '@/lib/logger'
import { Layout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import TicketsPage from '@/pages/TicketsPage'
import CustomersPage from '@/pages/CustomersPage'

export function App(): React.ReactElement {
  logger.methodEntry('App')
  const result = (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
            </Route>

            {/* Protected routes - all inside DashboardLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/tickets" element={<TicketsPage />} />
                      <Route path="/customers" element={<CustomersPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" />
              <Route path="/tickets" />
              <Route path="/customers" />
              <Route path="/settings" />
            </Route>
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
  logger.methodExit('App')
  return result
}

export default App

