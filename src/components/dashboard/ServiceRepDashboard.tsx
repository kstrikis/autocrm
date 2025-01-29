import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIInput } from '@/components/ai/AIInput';
import { AIActionsDashboard } from '@/components/ai/AIActionsDashboard';
import { TicketList } from '@/components/tickets/TicketList';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ServiceRepDashboard() {
  logger.methodEntry('ServiceRepDashboard.render');

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* AI Assistant Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Use the AI assistant to quickly add notes, update ticket status, or manage tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIInput />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <div className="grid grid-cols-1 gap-6">
        <div className="col-span-1">
          <Tabs defaultValue="tickets">
            <TabsList>
              <TabsTrigger value="tickets">Active Tickets</TabsTrigger>
              <TabsTrigger value="actions">AI Actions History</TabsTrigger>
            </TabsList>
            <TabsContent value="tickets" className="space-y-4">
              <TicketList role="service_rep" />
            </TabsContent>
            <TabsContent value="actions" className="space-y-4">
              <AIActionsDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );

  logger.methodExit('ServiceRepDashboard.render');
} 