import React from 'react';
import { Link } from 'react-router-dom';
import { logger } from '@/lib/logger';

export const NotFoundPage: React.FC = () => {
  logger.methodEntry('NotFoundPage');
  const result = (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
  logger.methodExit('NotFoundPage');
  return result;
};

export default NotFoundPage;
