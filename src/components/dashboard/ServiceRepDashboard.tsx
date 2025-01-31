import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { AIInput } from '../ai/AIInput';
import { AIActionsDashboard } from '../ai/AIActionsDashboard';
import { TicketList } from '../tickets/TicketList';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function ServiceRepDashboard(): JSX.Element {
  logger.methodEntry('ServiceRepDashboard');

  const [testInput, setTestInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleTestSubmit = async (): Promise<void> => {
    if (!testInput.trim() || isProcessing) return;

    logger.methodEntry('ServiceRepDashboard.handleTestSubmit');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('test-ai-action', {
        body: {
          input_text: testInput.trim(),
          user_id: user?.id
        }
      });

      if (error) throw error;

      logger.info('Test AI action response:', { data });

      setTestInput('');
      toast({
        title: "Success",
        description: `${data.message}\n${data.parsed_result}`,
        duration: 5000 // Give users more time to read the result
      });

    } catch (error) {
      logger.error('Error processing test input:', { error: (error as Error).message });
      toast({
        title: "Error",
        description: "Failed to process test input. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      logger.methodExit('ServiceRepDashboard.handleTestSubmit');
    }
  };

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

      <Card>
        <CardHeader>
          <CardTitle>AI Assistant (Test)</CardTitle>
          <CardDescription>Test the AI assistant functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              data-test="test-ai-input"
              placeholder="Type a test message..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="min-h-[100px]"
              disabled={isProcessing}
            />
            <div className="flex justify-end">
              <Button
                data-test="test-ai-submit"
                onClick={handleTestSubmit}
                disabled={!testInput.trim() || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Test Process
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 