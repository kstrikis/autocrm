import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export function AuthGuard(): React.ReactElement {
  logger.methodEntry('AuthGuard');
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    logger.info('User already authenticated, redirecting to dashboard');
    logger.methodExit('AuthGuard');
    return <Navigate to="/dashboard" replace />;
  }

  logger.methodExit('AuthGuard');
  return <Outlet />;
} 