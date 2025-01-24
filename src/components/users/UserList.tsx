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
import type { UserProfile, Ticket } from '@/lib/database.types';

const ITEMS_PER_PAGE = 10;

interface UserWithStats {
  id: string;
  fullName: string;
  totalTickets: number;
  openTickets: number;
  lastTicketDate: string | null;
  role: string;
  createdAt: string;
}

type SortField = 'name' | 'openTickets' | 'totalTickets' | 'lastTicket' | 'joined' | 'role';
type SortOrder = 'asc' | 'desc';
type RoleFilter = 'all' | 'customer' | 'service_rep' | 'admin';

export function UserList(): React.ReactElement {
  logger.methodEntry('UserList');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [sortField, setSortField] = useState<SortField>('lastTicket');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hasOpenTicketsFilter, setHasOpenTicketsFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  useEffect(() => {
    async function fetchUsers(): Promise<void> {
      try {
        setLoading(true);
        logger.info('UserList: Fetching users', { page, sortField, sortOrder, hasOpenTicketsFilter, roleFilter });

        // First get all user profiles with their ticket counts
        let query = supabase
          .from('user_profiles')
          .select(`
            id,
            fullName:full_name,
            role,
            createdAt:created_at,
            tickets!left!tickets_customer_id_fkey (
              id,
              status,
              createdAt:created_at
            )
          `)
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

        // Only apply role filter if not "all"
        if (roleFilter !== 'all') {
          query = query.eq('role', roleFilter);
        }

        const { data: rawUsers, error: supabaseError } = await query;

        if (supabaseError) {
          throw supabaseError;
        }

        // Transform the data to include ticket statistics
        const transformedUsers: UserWithStats[] = (rawUsers as unknown as UserProfile[]).map(user => {
          const tickets = user.tickets || [];
          const openTickets = tickets.filter((t: Ticket) => !['resolved', 'closed'].includes(t.status)).length;
          const lastTicket = tickets.length > 0 
            ? tickets.reduce((latest: Ticket, ticket: Ticket) => 
                latest.createdAt > ticket.createdAt ? latest : ticket
              ).createdAt
            : null;

          return {
            id: user.id,
            fullName: user.fullName,
            role: user.role,
            createdAt: user.createdAt,
            totalTickets: tickets.length,
            openTickets,
            lastTicketDate: lastTicket
          };
        });

        // Apply filters
        let filteredUsers = transformedUsers;
        if (hasOpenTicketsFilter !== 'all') {
          filteredUsers = transformedUsers.filter(c => 
            hasOpenTicketsFilter === 'yes' ? c.openTickets > 0 : c.openTickets === 0
          );
        }

        // Apply sorting
        filteredUsers.sort((a, b) => {
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
            case 'role':
              comparison = a.role.localeCompare(b.role);
              break;
          }
          return sortOrder === 'asc' ? comparison : -comparison;
        });

        setUsers(filteredUsers);
        logger.info('UserList: Users fetched successfully', { count: filteredUsers.length });
      } catch (err) {
        logger.error('UserList: Error fetching users', { error: err });
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    void fetchUsers();
  }, [page, sortField, sortOrder, hasOpenTicketsFilter, roleFilter]);

  const handleSort = (field: SortField): void => {
    if (field === sortField) {
      setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    logger.info('UserList: Loading users...');
    return <div>Loading users...</div>;
  }

  if (error) {
    logger.error('UserList: Error loading users', { error });
    return <div>Error loading users</div>;
  }

  const result = (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select
          value={roleFilter}
          onValueChange={(value: RoleFilter) => setRoleFilter(value)}
        >
          <SelectTrigger className="w-[180px] text-gray-900">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-900">All Users</SelectItem>
            <SelectItem value="customer" className="text-gray-900">Customers</SelectItem>
            <SelectItem value="service_rep" className="text-gray-900">Service Reps</SelectItem>
            <SelectItem value="admin" className="text-gray-900">Admins</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={hasOpenTicketsFilter}
          onValueChange={(value: 'all' | 'yes' | 'no') => setHasOpenTicketsFilter(value)}
        >
          <SelectTrigger className="w-[180px] text-gray-900">
            <SelectValue placeholder="Filter by open tickets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-900">All Users</SelectItem>
            <SelectItem value="yes" className="text-gray-900">Has Open Tickets</SelectItem>
            <SelectItem value="no" className="text-gray-900">No Open Tickets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table data-testid="user-list">
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('role')}
            >
              Role {sortField === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
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
          {users.map((user) => (
            <TableRow key={user.id} data-testid="user-item">
              <TableCell>{user.fullName}</TableCell>
              <TableCell>
                {user.role === 'admin' ? (
                  <Badge variant="destructive">{user.role}</Badge>
                ) : user.role === 'service_rep' ? (
                  <Badge style={{ backgroundColor: '#3b82f6', color: 'white' }}>{user.role}</Badge>
                ) : (
                  <Badge variant="default">{user.role}</Badge>
                )}
              </TableCell>
              <TableCell>
                {user.openTickets > 0 ? (
                  <Badge className="bg-orange-500">{user.openTickets}</Badge>
                ) : (
                  <span>0</span>
                )}
              </TableCell>
              <TableCell>{user.totalTickets}</TableCell>
              <TableCell>
                {user.lastTicketDate 
                  ? new Date(user.lastTicketDate).toLocaleDateString()
                  : 'Never'
                }
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={users.length < ITEMS_PER_PAGE}
        >
          Next
        </Button>
      </div>
    </div>
  );

  logger.methodExit('UserList');
  return result;
} 