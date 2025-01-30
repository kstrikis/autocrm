import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type AIAction = {
  id: string;
  created_at: string;
  input_text: string;
  action_type: 'add_note' | 'update_status' | 'update_tags';
  interpreted_action: {
    customer_name: string;
    note_content?: string;
    is_customer_visible?: boolean;
    status_update?: string;
    tags_to_add?: string[];
    tags_to_remove?: string[];
  };
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  error_message?: string;
  ticket_id: string;
};

export function AIActionsDashboard(): JSX.Element {
  logger.methodEntry('AIActionsDashboard');

  const [actions, setActions] = useState<AIAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchActions = async (): Promise<void> => {
    logger.methodEntry('AIActionsDashboard.fetchActions');
    try {
      const { data, error } = await supabase
        .from('ai_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      logger.error('Error fetching AI actions:', { error: error instanceof Error ? error.message : String(error) });
      toast({
        title: "Error",
        description: "Failed to load AI actions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
    logger.methodExit('AIActionsDashboard.fetchActions');
  };

  const handleAction = async (actionId: string, approve: boolean): Promise<void> => {
    logger.methodEntry('AIActionsDashboard.handleAction');
    setIsProcessing(true);

    try {
      if (approve) {
        // Execute the action
        const action = actions.find(a => a.id === actionId);
        if (!action) throw new Error('Action not found');

        const { error: updateError } = await supabase.rpc('update_ai_action_status', {
          action_id: actionId,
          new_status: 'approved'
        });

        if (updateError) throw updateError;

        // Execute action based on type
        switch (action.action_type) {
          case 'add_note':
            await supabase.from('ticket_messages').insert({
              ticket_id: action.ticket_id,
              sender_id: user?.id,
              content: action.interpreted_action.note_content,
              is_internal: !action.interpreted_action.is_customer_visible
            });
            break;
          case 'update_status':
            if (action.interpreted_action.status_update) {
              await supabase
                .from('tickets')
                .update({ status: action.interpreted_action.status_update })
                .eq('id', action.ticket_id);
            }
            break;
          case 'update_tags':
            const { data: ticket } = await supabase
              .from('tickets')
              .select('tags')
              .eq('id', action.ticket_id)
              .single();

            const currentTags = new Set(ticket?.tags || []);
            action.interpreted_action.tags_to_remove?.forEach(tag => currentTags.delete(tag));
            action.interpreted_action.tags_to_add?.forEach(tag => currentTags.add(tag));

            await supabase
              .from('tickets')
              .update({ tags: Array.from(currentTags) })
              .eq('id', action.ticket_id);
            break;
        }

        await supabase.rpc('update_ai_action_status', {
          action_id: actionId,
          new_status: 'executed'
        });

        toast({
          title: "Success",
          description: "Action executed successfully"
        });
      } else {
        // Reject the action
        const { error } = await supabase.rpc('update_ai_action_status', {
          action_id: actionId,
          new_status: 'rejected'
        });

        if (error) throw error;
        toast({
          title: "Success",
          description: "Action rejected"
        });
      }
    } catch (error) {
      logger.error('Error handling AI action:', { error: error instanceof Error ? error.message : String(error) });
      toast({
        title: "Error",
        description: "Failed to process action",
        variant: "destructive"
      });

      // Update status to failed
      await supabase.rpc('update_ai_action_status', {
        action_id: actionId,
        new_status: 'failed',
        error_msg: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsProcessing(false);
      logger.methodExit('AIActionsDashboard.handleAction');
    }
  };

  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        await fetchActions();
      } catch (error) {
        logger.error('Error in initial fetchActions:', { error: error instanceof Error ? error.message : String(error) });
      }
    })();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('ai_actions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_actions',
        },
        (payload): void => {
          logger.info('Received real-time update for AI actions:', payload);
          void (async (): Promise<void> => {
            try {
              await fetchActions();
            } catch (error) {
              logger.error('Error in subscription fetchActions:', { error: error instanceof Error ? error.message : String(error) });
            }
          })();
        }
      );

    void (async (): Promise<void> => {
      try {
        await subscription.subscribe();
      } catch (error) {
        logger.error('Error subscribing to AI actions:', { error: error instanceof Error ? error.message : String(error) });
      }
    })();

    return (): void => {
      void subscription.unsubscribe();
    };
  }, []);

  const getStatusBadge = (status: AIAction['status']): JSX.Element => {
    const variants: Record<AIAction['status'], { variant: 'default' | 'destructive' | 'outline' | 'secondary', label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      approved: { variant: 'outline', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      executed: { variant: 'default', label: 'Executed' },
      failed: { variant: 'destructive', label: 'Failed' }
    };

    return <Badge variant={variants[status].variant}>{variants[status].label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  logger.methodExit('AIActionsDashboard');

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Actions Dashboard</CardTitle>
        <CardDescription>
          Review and manage AI-interpreted actions from service representatives
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Input</TableHead>
              <TableHead>Interpretation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((action) => (
              <TableRow key={action.id}>
                <TableCell>
                  {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {action.input_text}
                </TableCell>
                <TableCell className="max-w-[300px]">
                  <div className="space-y-1">
                    <div>Customer: {action.interpreted_action.customer_name}</div>
                    {action.interpreted_action.note_content && (
                      <div className="text-sm text-muted-foreground truncate">
                        Note: {action.interpreted_action.note_content}
                      </div>
                    )}
                    {action.interpreted_action.status_update && (
                      <div className="text-sm text-muted-foreground">
                        Status: {action.interpreted_action.status_update}
                      </div>
                    )}
                    {(action.interpreted_action.tags_to_add?.length || action.interpreted_action.tags_to_remove?.length) && (
                      <div className="text-sm text-muted-foreground">
                        Tags: {[
                          ...(action.interpreted_action.tags_to_add?.map(t => `+${t}`) || []),
                          ...(action.interpreted_action.tags_to_remove?.map(t => `-${t}`) || [])
                        ].join(', ')}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(action.status)}
                  {action.error_message && (
                    <div className="text-sm text-destructive mt-1">
                      {action.error_message}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {action.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleAction(action.id, true)}
                        disabled={isProcessing}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleAction(action.id, false)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 