/* eslint-disable enforce-logging/enforce-logging */
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';

export function AuthPage(): React.ReactElement {
  logger.methodEntry('AuthPage');
  const { user, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [seeding, setSeeding] = useState(false);

  // Sample account buttons for demo purposes
  const handleSampleLogin = async (type: 'customer' | 'service_rep' | 'admin'): Promise<void> => {
    logger.methodEntry('AuthPage.handleSampleLogin', { type });
    const credentials = {
      customer: { email: 'customer1@example.com', password: 'Password123!' },
      service_rep: { email: 'service1@example.com', password: 'Password123!' },
      admin: { email: 'admin@example.com', password: 'Password123!' }
    };
    
    try {
      await signIn(credentials[type].email, credentials[type].password);
      logger.info('Sample login successful', { type });
    } catch (error) {
      // Error is already logged by AuthContext
      void error;
    }
    logger.methodExit('AuthPage.handleSampleLogin');
  };

  const handleSeedData = async () => {
    logger.methodEntry('handleSeedData');
    try {
      setSeeding(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-test-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Demo data seeded successfully'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Failed to seed data: ${result.error}`
        });
      }
    } catch (error) {
      logger.error('Error seeding data:', error instanceof Error ? error.message : String(error));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to seed demo data'
      });
    } finally {
      setSeeding(false);
      logger.methodExit('handleSeedData');
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const result = (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to AutoCRM</CardTitle>
          <CardDescription>Sign in or create an account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="signup-tab">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-gray-500 text-center">
            Try our demo accounts:
          </div>
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleSampleLogin('customer')}
              data-testid="demo-customer-button"
            >
              Demo Customer
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleSampleLogin('service_rep')}
              data-testid="demo-service-rep-button"
            >
              Demo Service Rep
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleSampleLogin('admin')}
              data-testid="demo-admin-button"
            >
              Demo Admin
            </Button>
          </div>
          <div className="w-full">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSeedData}
              disabled={seeding}
              data-testid="seed-data-button"
            >
              {seeding ? 'Loading Demo Data...' : 'Reset Demo Data'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );

  logger.methodExit('AuthPage');
  return result;
} 