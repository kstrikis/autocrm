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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

const ITEMS_PER_PAGE = 10;

interface CustomerWithStats {
  id: string;
  fullName: string;
  totalTickets: number;
  openTickets: number;
  lastTicketDate: string | null;
  role: string;
  createdAt: string;
}

type SortField = 'name' | 'openTickets' | 'totalTickets' | 'lastTicket' | 'joined';
type SortOrder = 'asc' | 'desc';

export function CustomerList(): React.ReactElement {
  logger.methodEntry('CustomerList');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [sortField, setSortField] = useState<SortField>('lastTicket');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hasOpenTicketsFilter, setHasOpenTicketsFilter] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    async function fetchCustomers(): Promise<void> {
      try {
        setLoading(true);
        logger.info('CustomerList: Fetching customers', { page, sortField, sortOrder, hasOpenTicketsFilter });

        // First get the customer profiles with their ticket counts
        let query = supabase
          .from('user_profiles')
          .select(`
            id,
            full_name,
            role,
            created_at,
            tickets!tickets_customer_id_fkey (
              id,
              status,
              created_at
            )
          `)
          .eq('role', 'customer')
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

        const { data: rawCustomers, error: supabaseError } = await query;

        if (supabaseError) {
          throw supabaseError;
        }

        // Transform the data to include ticket statistics
        const transformedCustomers: CustomerWithStats[] = rawCustomers.map(customer => {
          const tickets = customer.tickets || [];
          const openTickets = tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length;
          const lastTicket = tickets.length > 0 
            ? tickets.reduce((latest, ticket) => 
                latest.created_at > ticket.created_at ? latest : ticket
              ).created_at
            : null;

          return {
            id: customer.id,
            fullName: customer.full_name,
            role: customer.role,
            createdAt: customer.created_at,
            totalTickets: tickets.length,
            openTickets,
            lastTicketDate: lastTicket
          };
        });

        // Apply filters
        let filteredCustomers = transformedCustomers;
        if (hasOpenTicketsFilter !== 'all') {
          filteredCustomers = transformedCustomers.filter(c => 
            hasOpenTicketsFilter === 'yes' ? c.openTickets > 0 : c.openTickets === 0
          );
        }

        // Apply sorting
        filteredCustomers.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case 'name':
              comparison = a.fullName.localeCompare(b.fullName);
              break;
            case 'openTickets':
              comparison = a.openTickets - b.openTickets;
              break;
            case 'totalTickets':
              comparison = a.totalTickets - b.totalTickets;
              break;
            case 'lastTicket':
              if (!a.lastTicketDate) return 1;
              if (!b.lastTicketDate) return -1;
              comparison = new Date(a.lastTicketDate).getTime() - new Date(b.lastTicketDate).getTime();
              break;
            case 'joined':
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              break;
          }
          return sortOrder === 'asc' ? comparison : -comparison;
        });

        setCustomers(filteredCustomers);
        logger.info('CustomerList: Customers fetched successfully', { count: filteredCustomers.length });
      } catch (err) {
        logger.error('CustomerList: Error fetching customers', { error: err });
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    void fetchCustomers();
  }, [page, sortField, sortOrder, hasOpenTicketsFilter]);

  const handleSort = (field: SortField): void => {
    if (field === sortField) {
      setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    logger.info('CustomerList: Loading customers...');
    return <div>Loading customers...</div>;
  }

  if (error) {
    logger.error('CustomerList: Error loading customers', { error });
    return <div>Error loading customers</div>;
  }

  const result = (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select
          value={hasOpenTicketsFilter}
          onValueChange={(value: 'all' | 'yes' | 'no') => setHasOpenTicketsFilter(value)}
        >
          <SelectTrigger className="w-[180px] text-gray-900">
            <SelectValue placeholder="Filter by open tickets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-900">All Customers</SelectItem>
            <SelectItem value="yes" className="text-gray-900">Has Open Tickets</SelectItem>
            <SelectItem value="no" className="text-gray-900">No Open Tickets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Customer Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('openTickets')}
            >
              Open Tickets {sortField === 'openTickets' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('totalTickets')}
            >
              Total Tickets {sortField === 'totalTickets' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('lastTicket')}
            >
              Last Ticket {sortField === 'lastTicket' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('joined')}
            >
              Joined {sortField === 'joined' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.fullName}</TableCell>
              <TableCell>
                {customer.openTickets > 0 ? (
                  <Badge className="bg-orange-500">{customer.openTickets}</Badge>
                ) : (
                  <span>0</span>
                )}
              </TableCell>
              <TableCell>{customer.totalTickets}</TableCell>
              <TableCell>
                {customer.lastTicketDate 
                  ? new Date(customer.lastTicketDate).toLocaleDateString()
                  : 'Never'
                }
              </TableCell>
              <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
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
          disabled={!customers || customers.length < ITEMS_PER_PAGE}
          className="text-gray-900"
        >
          Next
        </Button>
      </div>
    </div>
  );

  logger.methodExit('CustomerList');
  return result;
} 