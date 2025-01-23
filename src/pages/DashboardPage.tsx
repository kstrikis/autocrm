import React from 'react';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import CustomerDashboardMetrics from '@/components/dashboard/CustomerDashboardMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export function DashboardPage(): React.ReactElement {
  logger.methodEntry('DashboardPage');
  const { user } = useAuth();
  const isServiceRep = user?.user_metadata.role === 'service_rep';

  const result = (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome, {user?.user_metadata.full_name}!</h1>
      <p className="mt-2 text-sm text-gray-600">
        {isServiceRep 
          ? "Here's what's happening today."
          : "Here's an overview of your support tickets."}
      </p>
      
      <div className="mt-6">
        {isServiceRep ? <DashboardMetrics /> : <CustomerDashboardMetrics />}
      </div>
    </div>
  );

  logger.methodExit('DashboardPage');
  return result;
}

export default DashboardPage; 