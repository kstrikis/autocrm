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

interface TicketListProps {
  role: 'customer' | 'service_rep' | 'admin';
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function TicketList({ role }: TicketListProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  logger.methodEntry('TicketList.render');

  useEffect(() => {
    const fetchTickets = async () => {
      logger.methodEntry('TicketList.fetchTickets');
      try {
        let query = supabase
          .from('tickets')
          .select(`
            *,
            customer:customer_id(full_name),
            assigned_to_user:assigned_to(full_name)
          `)
          .order('created_at', { ascending: false });

        // Filter based on role
        if (role === 'customer') {
          query = query.eq('customer_id', user?.id);
        } else if (role === 'service_rep') {
          query = query.eq('assigned_to', user?.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTickets(data || []);
      } catch (error) {
        logger.error('Error fetching tickets:', error);
      } finally {
        setIsLoading(false);
      }
      logger.methodExit('TicketList.fetchTickets');
    };

    fetchTickets();

    // Subscribe to changes
    const channel = supabase
      .channel('tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [role, user?.id]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary', label: string }> = {
      new: { variant: 'secondary', label: 'New' },
      open: { variant: 'default', label: 'Open' },
      pending_customer: { variant: 'outline', label: 'Pending Customer' },
      pending_internal: { variant: 'outline', label: 'Pending Internal' },
      resolved: { variant: 'default', label: 'Resolved' },
      closed: { variant: 'destructive', label: 'Closed' }
    };

    const { variant, label } = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary', label: string }> = {
      low: { variant: 'secondary', label: 'Low' },
      medium: { variant: 'outline', label: 'Medium' },
      high: { variant: 'default', label: 'High' },
      urgent: { variant: 'destructive', label: 'Urgent' }
    };

    const { variant, label } = variants[priority] || { variant: 'secondary', label: priority };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  logger.methodExit('TicketList.render');

  return (
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
            <TableCell>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 