import { useState, useEffect } from 'react';
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
}

// type SortField = 'name' | 'openTickets' | 'totalTickets' | 'lastTicket' | 'joined';
// type SortOrder = 'asc' | 'desc';

interface SupabaseTicket {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  customer: { id: string; full_name: string } | null;
  assigned: { id: string; full_name: string } | null;
}

export function TicketQueue(): React.ReactElement {
  logger.methodEntry('TicketQueue');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tickets, setTickets] = useState<TicketWithNames[]>([]);
//   const [sortField, setSortField] = useState<SortField>('lastTicket');
//   const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
//   const [hasOpenTicketsFilter, setHasOpenTicketsFilter] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    async function fetchTickets(): Promise<void> {
      try {
        setLoading(true);
        
        // Log the current auth state
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        logger.info('TicketQueue: Auth state', { 
          hasSession: !!session,
          userId: session?.user?.id,
          userMetadata: session?.user?.user_metadata,
          appMetadata: session?.user?.app_metadata,
          role: session?.user?.role
        });

        if (authError) {
          logger.error('TicketQueue: Auth error', { error: authError });
          throw authError;
        }

        logger.info('TicketQueue: Fetching tickets', { page, statusFilter, priorityFilter });

        let query = supabase
          .from('tickets')
          .select(`
            id,
            title,
            status,
            priority,
            created_at,
            customer:user_profiles!customer_id(id, full_name),
            assigned:user_profiles!assigned_to(id, full_name)
          `)
          .order('created_at', { ascending: false })
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

        // Log the query parameters instead of SQL
        logger.debug('TicketQueue: Base query params', { 
          page,
          offset: (page - 1) * ITEMS_PER_PAGE,
          limit: ITEMS_PER_PAGE
        });

        if (statusFilter.length > 0 && statusFilter[0] !== 'all') {
          query = query.in('status', statusFilter);
          logger.debug('TicketQueue: Added status filter', { statusFilter });
        }

        if (priorityFilter.length > 0 && priorityFilter[0] !== 'all') {
          query = query.in('priority', priorityFilter);
          logger.debug('TicketQueue: Added priority filter', { priorityFilter });
        }

        // Log the final query parameters
        logger.debug('TicketQueue: Final query params', {
          page,
          offset: (page - 1) * ITEMS_PER_PAGE,
          limit: ITEMS_PER_PAGE,
          statusFilter,
          priorityFilter
        });

        const { data, error: supabaseError, count } = await query;

        if (supabaseError) {
          logger.error('TicketQueue: Supabase error', { 
            error: supabaseError,
            errorMessage: supabaseError.message,
            errorDetails: supabaseError.details,
            errorHint: supabaseError.hint,
            queryParams: {
              page,
              offset: (page - 1) * ITEMS_PER_PAGE,
              limit: ITEMS_PER_PAGE,
              statusFilter,
              priorityFilter,
              filters: {
                status: statusFilter.length > 0 ? statusFilter : 'all',
                priority: priorityFilter.length > 0 ? priorityFilter : 'all'
              }
            }
          });
          throw supabaseError;
        }

        // Log the raw response with more details
        logger.debug('TicketQueue: Raw response', { 
          dataCount: data?.length,
          totalCount: count,
          firstRecord: data?.[0],
          hasNulls: data?.some(d => !d.customer || !d.assigned),
          allData: data,
          queryParams: {
            page,
            offset: (page - 1) * ITEMS_PER_PAGE,
            limit: ITEMS_PER_PAGE,
            statusFilter,
            priorityFilter,
            filters: {
              status: statusFilter.length > 0 ? statusFilter : 'all',
              priority: priorityFilter.length > 0 ? priorityFilter : 'all'
            }
          }
        });

        // Transform the data to match our interface
        const transformedTickets = (data as unknown as SupabaseTicket[]).map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status as Exclude<TicketStatus, 'all'>,
          priority: ticket.priority as Exclude<TicketPriority, 'all'>,
          createdAt: ticket.created_at,
          customerName: ticket.customer?.full_name || 'Unknown',
          assignedToName: ticket.assigned?.full_name || null
        }));

        setTickets(transformedTickets);
        logger.debug('TicketQueue: Tickets fetched successfully', { 
          count: transformedTickets.length,
          tickets: transformedTickets.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            customerName: t.customerName
          }))
        });
      } catch (err) {
        logger.error('TicketQueue: Error fetching tickets', { 
          error: err,
          errorStack: (err as Error).stack,
          context: {
            page,
            statusFilter,
            priorityFilter
          }
        });
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    void fetchTickets();
  }, [page, statusFilter, priorityFilter]);

  if (loading) {
    logger.info('TicketQueue: Loading tickets...');
    return <div>Loading tickets...</div>;
  }

  if (error) {
    logger.error('TicketQueue: Error loading tickets', { error });
    return <div>Error loading tickets</div>;
  }

  const result = (
    <div className="space-y-4">
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Created</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Assigned To</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets?.map((ticket) => (
            <TableRow key={ticket.id}>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="text-gray-900"
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={!tickets || tickets.length < ITEMS_PER_PAGE}
          className="text-gray-900"
        >
          Next
        </Button>
      </div>
    </div>
  );

  logger.methodExit('TicketQueue');
  return result;
} 