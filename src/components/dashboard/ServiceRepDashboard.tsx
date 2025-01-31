import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';
import { AIInput } from '../ai/AIInput';
import { AIActionsDashboard } from '../ai/AIActionsDashboard';
import { TicketList } from '../tickets/TicketList';

export function ServiceRepDashboard(): JSX.Element {
  logger.methodEntry('ServiceRepDashboard');

  logger.methodExit('ServiceRepDashboard');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
          <CardDescription>Let AI help you manage customer interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <AIInput />
        </CardContent>
      </Card>

      <Tabs defaultValue="ai_actions">
        <TabsList>
          <TabsTrigger value="tickets">Active Tickets</TabsTrigger>
          <TabsTrigger value="ai_actions">AI Actions History</TabsTrigger>
        </TabsList>
        <TabsContent value="tickets">
          <TicketList role="service_rep" />
        </TabsContent>
        <TabsContent value="ai_actions">
          <AIActionsDashboard key="ai_actions" />
        </TabsContent>
      </Tabs>
    </div>
  );
} 