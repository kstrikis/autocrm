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
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type AIAction = {
  id: string;
  created_at: string;
  input_text: string;
  action_type: 'add_note' | 'update_status' | 'update_tags' | 'assign_ticket';
  interpreted_action: {
    note_content?: string;
    is_customer_visible?: boolean;
    status_update?: string;
    tags_to_add?: string[];
    tags_to_remove?: string[];
    assign_to?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  error_message?: string;
  ticket_id: string;
  ticket?: {
    title: string;
    status: string;
  };
};

export function AIActionsDashboard(): JSX.Element {
  logger.methodEntry('AIActionsDashboard');
  const [actions, setActions] = useState<AIAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchActions = async (): Promise<void> => {
    logger.methodEntry('AIActionsDashboard.fetchActions');
    try {
      logger.info('Fetching AI actions from database');
      logger.info('Current user ID:', { userId: user?.id });

      const { data, error } = await supabase
        .from('ai_actions')
        .select(`
          id,
          created_at,
          input_text,
          action_type,
          interpreted_action,
          status,
          error_message,
          ticket_id,
          ticket:tickets (
            title,
            status
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching AI actions:', { error });
        throw error;
      }
      
      logger.info('Fetched AI actions:', { count: data?.length || 0, data });
      setActions(data || []);
    } catch (error) {
      logger.error('Failed to load AI actions:', { error: error instanceof Error ? error.message : String(error) });
      toast({
        title: "Error",
        description: "Failed to load AI actions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      logger.methodExit('AIActionsDashboard.fetchActions');
    }
  };

  const handleAction = async (actionId: string, approve: boolean): Promise<void> => {
    try {
      const action = actions.find(a => a.id === actionId);
      if (!action) throw new Error('Action not found');

      await supabase
        .from('ai_actions')
        .update({ 
          status: approve ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      await fetchActions();

      toast({
        title: "Success",
        description: approve ? "Action approved" : "Action rejected"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process action",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    logger.methodEntry('AIActionsDashboard.useEffect');
    
    if (!user?.id) {
      logger.info('No user ID available yet, skipping fetch');
      return;
    }

    // Fetch immediately
    fetchActions().catch(error => {
      logger.error('Error in initial fetch:', { error: error instanceof Error ? error.message : String(error) });
    });

    // Set up realtime subscription
    logger.info('Setting up realtime subscription for ai_actions');
    const subscription = supabase
      .channel('ai_actions')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'ai_actions',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          logger.info('Received realtime update:', { payload });
          logger.info('Current user ID:', { userId: user?.id });
          void fetchActions();
        }
      )
      .subscribe((status) => {
        logger.info('Subscription status:', { status });
        logger.info('Subscription filter:', { filter: `user_id=eq.${user?.id}` });
        setIsSubscribed(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          void fetchActions();
        }
      });

    return () => {
      logger.info('Cleaning up realtime subscription');
      void subscription.unsubscribe();
      setIsSubscribed(false);
      logger.methodExit('AIActionsDashboard.useEffect');
    };
  }, [user]);

  logger.methodExit('AIActionsDashboard');

  if (isLoading || !isSubscribed) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Actions History</CardTitle>
        <CardDescription>
          Review and manage AI-interpreted actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Input</TableHead>
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
                <TableCell>
                  {action.ticket?.title || 'Unknown Ticket'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {action.action_type}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate" title={action.input_text}>
                    {action.input_text}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={action.status === 'pending' ? 'secondary' : 'default'}>
                    {action.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {action.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(): Promise<void> => handleAction(action.id, true)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(): Promise<void> => handleAction(action.id, false)}
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