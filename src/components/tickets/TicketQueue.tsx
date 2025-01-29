import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TicketListItem, TicketPriority, TicketStatus } from '@/types/ticket';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { EditTicketForm } from './EditTicketForm';

const ITEMS_PER_PAGE = 10;

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors = {
  new: 'bg-purple-500',
  open: 'bg-blue-500',
  pending_customer: 'bg-yellow-500',
  pending_internal: 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

interface TicketWithNames extends Omit<TicketListItem, 'customerId' | 'assignedTo'> {
  customerName: string;
  assignedToName: string | null;
  description: string;
  customerId: string;
  assignedTo: string | null;
}

interface SupabaseTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  customer: { id: string; full_name: string } | null;
  assigned: { id: string; full_name: string } | null;
  customer_id: string;
  assigned_to: string | null;
}

export function TicketQueue(): React.ReactElement {
  logger.methodEntry('TicketQueue');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tickets, setTickets] = useState<TicketWithNames[]>([]);
  const navigate = useNavigate();
//   const [sortField, setSortField] = useState<SortField>('lastTicket');
//   const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
//   const [hasOpenTicketsFilter, setHasOpenTicketsFilter] = useState<'all' | 'yes' | 'no'>('all');

  // Function to transform a Supabase ticket to our interface
  const transformTicket = (ticket: SupabaseTicket): TicketWithNames => {
    logger.debug('TicketQueue: Transforming ticket data', { 
      ticketId: ticket.id,
      assigned: ticket.assigned,
      assignedTo: ticket.assigned_to
    });
    
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status as Exclude<TicketStatus, 'all'>,
      priority: ticket.priority as Exclude<TicketPriority, 'all'>,
      createdAt: ticket.created_at,
      customerName: ticket.customer?.full_name || 'Unknown',
      customerId: ticket.customer_id,
      assignedToName: ticket.assigned?.full_name || null,
      assignedTo: ticket.assigned_to
    };
  };

  // Initial subscription setup
  useEffect(() => {
    logger.info('TicketQueue: Setting up subscription');
    setLoading(true);

    // Initial query to get tickets
    const getInitialTickets = async (): Promise<void> => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) {
          logger.error('TicketQueue: Auth error', { error: authError });
          throw authError;
        }

        let query = supabase
          .from('tickets')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            created_at,
            customer_id,
            assigned_to,
            customer:user_profiles!tickets_customer_id_fkey(id, full_name),
            assigned:user_profiles!tickets_assigned_to_fkey(id, full_name)
          `)
          .order('created_at', { ascending: false })
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

        if (statusFilter.length > 0 && statusFilter[0] !== 'all') {
          query = query.in('status', statusFilter);
        }

        if (priorityFilter.length > 0 && priorityFilter[0] !== 'all') {
          query = query.in('priority', priorityFilter);
        }

        if (session?.user?.user_metadata?.role === 'customer') {
          query = query.eq('customer_id', session.user.id);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) throw supabaseError;

        const transformedTickets = (data?.map(d => ({
          ...d,
          customer: d.customer ? { id: (d.customer as any).id, full_name: (d.customer as any).full_name } : null,
          assigned: d.assigned ? { id: (d.assigned as any).id, full_name: (d.assigned as any).full_name } : null
        } as SupabaseTicket)).map(transformTicket));

        logger.info('TicketQueue: Raw ticket data', { tickets: data });
        logger.info('TicketQueue: Transformed ticket data', { tickets: transformedTickets });
        setTickets(transformedTickets);
        logger.info('TicketQueue: Initial tickets loaded', { count: transformedTickets.length, tickets: transformedTickets });
      } catch (err) {
        logger.error('TicketQueue: Error loading initial tickets', { error: err });
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    void getInitialTickets();

    // Set up real-time subscription
    const channel = supabase.channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        async (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }): Promise<void> => {
          logger.info('TicketQueue: Received real-time update', { 
            eventType: payload.eventType,
            ticketId: payload.new?.id
          });

          // For INSERT and UPDATE events, check if the ticket belongs to the current user
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            if (authError) {
              logger.error('TicketQueue: Auth error during real-time update', { error: authError });
              return;
            }

            // If in customer mode, only update if the ticket belongs to the current user
            if (session?.user?.user_metadata?.role === 'customer') {
              const newTicket = payload.new as { customer_id: string };
              if (newTicket.customer_id !== session.user.id) {
                logger.debug('TicketQueue: Ignoring ticket update for different customer', {
                  ticketCustomerId: newTicket.customer_id,
                  currentUserId: session.user.id
                });
                return;
              }
            }

            // Get the full ticket data with customer and assigned user info
            const { data: ticketData, error: ticketError } = await supabase
              .from('tickets')
              .select(`
                id,
                title,
                description,
                status,
                priority,
                created_at,
                customer_id,
                assigned_to,
                customer:user_profiles!tickets_customer_id_fkey(id, full_name),
                assigned:user_profiles!tickets_assigned_to_fkey(id, full_name)
              `)
              .eq('id', payload.new?.id || '')
              .single();

            if (ticketError) {
              logger.error('TicketQueue: Error fetching updated ticket data', { error: ticketError });
              return;
            }

            if (ticketData) {
              const transformedData = {
                ...ticketData,
                customer: ticketData.customer ? { id: (ticketData.customer as any).id, full_name: (ticketData.customer as any).full_name } : null,
                assigned: ticketData.assigned ? { id: (ticketData.assigned as any).id, full_name: (ticketData.assigned as any).full_name } : null
              } as SupabaseTicket;
              
              setTickets(prevTickets => {
                const updatedTickets = [...prevTickets];
                const index = updatedTickets.findIndex(t => t.id === transformedData.id);
                
                if (index !== -1) {
                  // Update existing ticket
                  updatedTickets[index] = transformTicket(transformedData);
                } else if (updatedTickets.length < ITEMS_PER_PAGE) {
                  // Add new ticket if we have space
                  updatedTickets.unshift(transformTicket(transformedData));
                }
                
                return updatedTickets;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setTickets(prevTickets => 
              prevTickets.filter(t => t.id !== payload.old?.id)
            );
          }
        }
      )
      .subscribe((status: string): void => {
        logger.info('TicketQueue: Subscription status', { status });
      });

    return (): void => {
      logger.info('TicketQueue: Cleaning up subscription');
      void channel.unsubscribe();
    };
  }, [page, statusFilter, priorityFilter]);

  const handleTicketClick = (ticketId: string): void => {
    logger.info('TicketQueue: Navigating to ticket details', { ticketId });
    void navigate(`/tickets/${ticketId}`);
  };

  const result = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Select
            value={statusFilter[0] || undefined}
            onValueChange={(value: string) => setStatusFilter(value === 'all' ? [] : [value as TicketStatus])}
          >
            <SelectTrigger className="w-[180px] text-gray-900">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending_customer">Pending Customer</SelectItem>
              <SelectItem value="pending_internal">Pending Internal</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter[0] || undefined}
            onValueChange={(value: string) => setPriorityFilter(value === 'all' ? [] : [value as TicketPriority])}
          >
            <SelectTrigger className="w-[180px] text-gray-900">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div data-test="tickets-loading" className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : error ? (
        <div className="text-red-500">Error loading tickets: {error.message}</div>
      ) : tickets.length === 0 ? (
        <div className="text-gray-500">No tickets found</div>
      ) : (
        <Table data-testid="ticket-list">
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets?.map((ticket) => (
              <TableRow 
                key={ticket.id} 
                data-testid="ticket-item"
                onClick={(): void => handleTicketClick(ticket.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>
                  <Badge className={statusColors[ticket.status]}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={priorityColors[ticket.priority]}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.customerName}</TableCell>
                <TableCell>{ticket.assignedToName || 'Unassigned'}</TableCell>
                <TableCell onClick={(e): void => e.stopPropagation()}>
                  <EditTicketForm
                    ticket={{
                      id: ticket.id,
                      title: ticket.title,
                      description: ticket.description,
                      status: ticket.status,
                      priority: ticket.priority,
                      customerId: ticket.customerId,
                      assignedTo: ticket.assignedTo || undefined,
                      createdAt: ticket.createdAt,
                      updatedAt: ticket.createdAt,
                      tags: [],
                      metadata: {}
                    }}
                    onUpdate={(): void => {}} // No need to refetch as we have realtime updates
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={(): void => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          variant="outline"
          onClick={(): void => setPage((p) => p + 1)}
          disabled={!tickets || tickets.length < ITEMS_PER_PAGE}
        >
          Next
        </Button>
      </div>
    </div>
  );

  logger.methodExit('TicketQueue');
  return result;
} 