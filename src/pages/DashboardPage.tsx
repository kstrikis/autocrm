import React, { useEffect } from 'react'
import { useUser } from '@/lib/contexts/UserContext'
import { logger } from '@/lib/logger'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function DashboardPage(): React.ReactElement {
  logger.methodEntry('DashboardPage')
  const { user } = useUser()

  useEffect((): (() => void) => {
    logger.methodEntry('DashboardPage.useEffect')
    return () => logger.methodExit('DashboardPage.useEffect')
  }, [])

  const result = (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Welcome, {user?.name}!</CardTitle>
          <CardDescription>This is your personal dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <p>More features coming soon!</p>
        </CardContent>
      </Card>
    </div>
  )

  logger.methodExit('DashboardPage')
  return result
} 