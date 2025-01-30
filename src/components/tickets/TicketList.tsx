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
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/database.types';

type TicketWithRelations = Database['public']['Tables']['tickets']['Row'] & {
  customer: {
    full_name: string;
  } | null;
  assigned_to_user: {
    full_name: string;
  } | null;
};

interface TicketListProps {
  role: Database['public']['Enums']['user_role'];
}

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function TicketList({ role }: TicketListProps): JSX.Element {
  logger.methodEntry('TicketList');

  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchTickets = async (): Promise<void> => {
    logger.methodEntry('TicketList.fetchTickets');
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          customer:user_profiles!tickets_customer_id_fkey(full_name),
          assigned_to_user:user_profiles!tickets_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      // Filter based on role
      if (role === 'customer' && user?.id) {
        query = query.eq('customer_id', user.id);
      } else if (role === 'service_rep' && user?.id) {
        // Show both assigned and unassigned tickets
        query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data as TicketWithRelations[] || []);
    } catch (error) {
      logger.error('Error fetching tickets:', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
    logger.methodExit('TicketList.fetchTickets');
  };

  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        await fetchTickets();
      } catch (error) {
        logger.error('Error in initial fetchTickets:', { error: error instanceof Error ? error.message : String(error) });
      }
    })();

    // Subscribe to changes
    const subscription = supabase
      .channel('tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        (payload): void => {
          logger.info('Received real-time update for tickets:', payload);
          void (async (): Promise<void> => {
            try {
              await fetchTickets();
            } catch (error) {
              logger.error('Error in subscription fetchTickets:', { error: error instanceof Error ? error.message : String(error) });
            }
          })();
        }
      );

    void (async (): Promise<void> => {
      try {
        await subscription.subscribe();
      } catch (error) {
        logger.error('Error subscribing to tickets:', { error: error instanceof Error ? error.message : String(error) });
      }
    })();

    return (): void => {
      void subscription.unsubscribe();
    };
  }, [role, user?.id]);

  const getStatusBadge = (status: Database['public']['Enums']['ticket_status']): JSX.Element => {
    const variants: Record<Database['public']['Enums']['ticket_status'], { variant: 'default' | 'destructive' | 'outline' | 'secondary', label: string }> = {
      new: { variant: 'secondary', label: 'New' },
      open: { variant: 'default', label: 'Open' },
      pending_customer: { variant: 'outline', label: 'Pending Customer' },
      pending_internal: { variant: 'outline', label: 'Pending Internal' },
      resolved: { variant: 'default', label: 'Resolved' },
      closed: { variant: 'destructive', label: 'Closed' }
    };

    return <Badge variant={variants[status].variant}>{variants[status].label}</Badge>;
  };

  const getPriorityBadge = (priority: Database['public']['Enums']['ticket_priority']): JSX.Element => {
    const variants: Record<Database['public']['Enums']['ticket_priority'], { variant: 'default' | 'destructive' | 'outline' | 'secondary', label: string }> = {
      low: { variant: 'secondary', label: 'Low' },
      medium: { variant: 'outline', label: 'Medium' },
      high: { variant: 'default', label: 'High' },
      urgent: { variant: 'destructive', label: 'Urgent' }
    };

    return <Badge variant={variants[priority].variant}>{variants[priority].label}</Badge>;
  };

  const formatDate = (date: string): string => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  logger.methodExit('TicketList');

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>{ticket.title}</TableCell>
              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
              <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
              <TableCell>{ticket.customer?.full_name}</TableCell>
              <TableCell>{ticket.assigned_to_user?.full_name || 'Unassigned'}</TableCell>
              <TableCell>{formatDate(ticket.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 