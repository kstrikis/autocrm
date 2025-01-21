import React from 'react';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export const DashboardPage: React.FC = () => {
  logger.methodEntry('DashboardPage');
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome, {user?.user_metadata.full_name}!</h1>
      <p className="mt-2 text-sm text-gray-600">Here's what's happening today.</p>
      
      <div className="mt-6">
        <DashboardMetrics />
      </div>
    </div>
  );
};

export default DashboardPage; 