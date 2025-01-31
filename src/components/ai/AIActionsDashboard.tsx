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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
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
  error_message?: string | null;
  ticket_id: string;
  assign_to_user?: {
    id: string;
    full_name: string;
  };
  ticket: {
    title: string;
    status: string;
    created_at: string;
    description: string;
    priority: string;
    tags: string[];
    customer: {
      id: string;
      name: string;
    };
  } | null;
};

function getHumanReadableAction(action: AIAction): string {
  switch (action.action_type) {
    case 'add_note':
      return `Add ${action.interpreted_action.is_customer_visible ? 'customer-visible' : 'internal'} note: "${action.interpreted_action.note_content}"`;
    case 'update_status':
      return `Update status to: ${action.interpreted_action.status_update}`;
    case 'update_tags':
      const addTags = action.interpreted_action.tags_to_add?.join(', ') || '';
      const removeTags = action.interpreted_action.tags_to_remove?.join(', ') || '';
      return `Tags: ${addTags ? `+[${addTags}]` : ''} ${removeTags ? `-[${removeTags}]` : ''}`;
    case 'assign_ticket':
      logger.info('Processing assign_ticket action', {
        assignToUser: action.assign_to_user,
        interpretedAction: action.interpreted_action
      });
      const assignToUser = action.assign_to_user?.full_name || 'Unknown User';
      const customerName = action.ticket?.customer?.name || 'Unknown Customer';
      return `Assign ${customerName}'s ticket to ${assignToUser}`;
    default:
      return 'Unknown action';
  }
}

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
          *,
          tickets:tickets (
            id,
            title,
            status,
            created_at,
            description,
            priority,
            tags,
            customer:user_profiles!tickets_customer_id_fkey (
              id,
              name:full_name
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching AI actions:', { error });
        throw error;
      }

      // Get all unique assign_to IDs
      const assignToIds = (data || [])
        .map(action => action.interpreted_action.assign_to)
        .filter((id): id is string => !!id);

      // Fetch user info for those IDs
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', assignToIds);

      if (userError) {
        logger.error('Error fetching user profiles:', { error: userError });
        throw userError;
      }

      // Create a map of user IDs to names
      const userMap = new Map(
        (userProfiles || []).map(user => [user.id, user])
      );

      // Transform the data to match our expected types
      const transformedData = (data || []).map(action => ({
        ...action,
        ticket: action.tickets,
        assign_to_user: action.interpreted_action.assign_to 
          ? userMap.get(action.interpreted_action.assign_to)
          : undefined
      }));

      logger.info('Fetched and transformed AI actions:', { 
        count: transformedData.length,
        userMap: Object.fromEntries(userMap),
        transformedData 
      });
      setActions(transformedData);
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
              <TableHead className="max-w-[200px]">Input</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Human Readable</TableHead>
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
                <TableCell className="max-w-[200px]">
                  <div className="text-xs text-muted-foreground line-clamp-2" title={action.input_text}>
                    {action.input_text}
                  </div>
                </TableCell>
                <TableCell>
                  <HoverCard openDelay={0} closeDelay={0}>
                    <HoverCardTrigger>
                      <span className="cursor-help underline decoration-dotted">
                        {action.ticket?.title || 'Unknown Ticket'}
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{action.ticket?.title}</h4>
                        <div className="text-sm">
                          <p><strong>Created:</strong> {action.ticket?.created_at ? format(new Date(action.ticket.created_at), 'PPp') : 'Unknown'}</p>
                          <p><strong>Description:</strong> {action.ticket?.description || 'No description'}</p>
                          <p><strong>Priority:</strong> {action.ticket?.priority || 'Not set'}</p>
                          <p><strong>Status:</strong> {action.ticket?.status || 'Unknown'}</p>
                          <p><strong>Tags:</strong> {action.ticket?.tags?.join(', ') || 'None'}</p>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>
                <TableCell>
                  {action.ticket?.customer?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  <HoverCard openDelay={0} closeDelay={0}>
                    <HoverCardTrigger>
                      <Badge variant="outline" className="cursor-help">
                        {action.action_type}
                      </Badge>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Action Details</h4>
                        <div className="text-sm">
                          <p><strong>Human Readable:</strong></p>
                          <p>{getHumanReadableAction(action)}</p>
                          <p className="mt-2"><strong>Raw Action:</strong></p>
                          <pre className="mt-1 rounded bg-slate-950 p-2 text-xs text-white">
                            {JSON.stringify(action.interpreted_action, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {getHumanReadableAction(action)}
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              onClick={(): Promise<void> => handleAction(action.id, true)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Approve action</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(): Promise<void> => handleAction(action.id, false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reject action</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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