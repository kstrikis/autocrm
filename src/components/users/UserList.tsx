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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { UserProfile, Ticket } from '@/lib/database.types';
import type { Database } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

type UserRole = Database['public']['Enums']['user_role'];

const ITEMS_PER_PAGE = 10;

interface UserWithStats {
  id: string;
  fullName: string;
  email: string;
  totalTickets: number;
  openTickets: number;
  lastTicketDate: string | null;
  role: UserRole;
  createdAt: string;
}

type SortField = 'name' | 'email' | 'openTickets' | 'totalTickets' | 'lastTicket' | 'joined' | 'role';
type SortOrder = 'asc' | 'desc';
type RoleFilter = 'all' | UserRole;
type BatchAction = {
  type: 'delete' | 'changeRole';
  role?: UserRole;
};

export function UserList(): React.ReactElement {
  logger.methodEntry('UserList');
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('lastTicket');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hasOpenTicketsFilter, setHasOpenTicketsFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<BatchAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTicketWarning, setShowTicketWarning] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [userIdsToProcess, setUserIdsToProcess] = useState<string[] | null>(null);
  const isAdmin = user?.user_metadata?.role === 'admin';

  const fetchUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      logger.info('UserList: Fetching users', { page, sortField, sortOrder, hasOpenTicketsFilter, roleFilter });

      // First get all user profiles with their ticket counts
      let query = supabase
        .from('user_profiles_with_email')
        .select(`
          id,
          fullName:full_name,
          displayName:display_name,
          avatarUrl:avatar_url,
          role,
          status,
          lastSeenAt:last_seen_at,
          createdAt:created_at,
          updatedAt:updated_at,
          email,
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
          fullName: user.fullName || user.displayName || user.id.split('-')[0],
          email: (user as unknown as { email?: string }).email || '',
          role: user.role as UserRole,
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
          case 'email':
            comparison = a.email.localeCompare(b.email);
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
  };

  // Set up realtime subscription
  useEffect(() => {
    logger.methodEntry('UserList.setupSubscription');
    const subscription = supabase
      .channel('user-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        () => {
          logger.info('UserList: Received realtime update for user_profiles');
          void fetchUsers();
        }
      )
      .subscribe((status) => {
        logger.info('UserList: Subscription status changed', { status });
      });

    return (): void => {
      logger.methodEntry('UserList.cleanup');
      void subscription.unsubscribe();
      logger.methodExit('UserList.cleanup');
    };
  }, []);

  // Fetch users when filters change
  useEffect(() => {
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

  const handleRowClick = (index: number, userId: string, event: React.MouseEvent): void => {
    if (!isAdmin) return;

    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const userIdsToSelect = users.slice(start, end + 1).map(u => u.id);
      
      setSelectedUsers(prev => {
        const next = new Set(prev);
        userIdsToSelect.forEach(id => next.add(id));
        return next;
      });
    } else {
      // Normal click: toggle selection
      setSelectedUsers(prev => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
      setLastSelectedIndex(index);
    }
  };

  const handleMouseDown = (index: number): void => {
    if (!isAdmin) return;
    setIsDragging(true);
    setDragStartIndex(index);
  };

  const handleMouseEnter = (index: number): void => {
    if (!isAdmin || !isDragging || dragStartIndex === null) return;

    const start = Math.min(dragStartIndex, index);
    const end = Math.max(dragStartIndex, index);
    const userIdsToSelect = users.slice(start, end + 1).map(u => u.id);
    
    setSelectedUsers(new Set(userIdsToSelect));
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
    setDragStartIndex(null);
  };

  useEffect(() => {
    // Add global mouse up handler
    document.addEventListener('mouseup', handleMouseUp);
    return (): void => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleBatchAction = (action: BatchAction, userIdsOverride?: string[]): void => {
    logger.methodEntry('UserList.handleBatchAction', { action, userIdsOverride });
    setErrorMessage(null); // Clear any previous errors
    setPendingAction(action);
    setShowConfirmDialog(true);
    setUserIdsToProcess(userIdsOverride || Array.from(selectedUsers));
    logger.methodExit('UserList.handleBatchAction');
  };

  const handleBatchDelete = (): void => {
    logger.methodEntry('UserList.handleBatchDelete');
    handleBatchAction({ type: 'delete' });
    logger.methodExit('UserList.handleBatchDelete');
  };

  const handleBatchRoleChange = (role: UserRole): void => {
    logger.methodEntry('UserList.handleBatchRoleChange', { role });
    handleBatchAction({ type: 'changeRole', role });
    logger.methodExit('UserList.handleBatchRoleChange');
  };

  const handleTicketWarningConfirm = (): void => {
    setShowTicketWarning(false);
    handleBatchAction({ type: 'delete' });
  };

  const executeBatchAction = async (): Promise<void> => {
    logger.methodEntry('UserList.executeBatchAction');
    const userIds = userIdsToProcess || Array.from(selectedUsers);
    
    if (!pendingAction) {
      logger.error('UserList: No pending action');
      throw new Error('No pending action');
    }

    if (!user) {
      logger.error('UserList: No authenticated user');
      throw new Error('You must be logged in to perform this action');
    }

    try {
      setLoading(true);
      logger.info('UserList: Starting batch action', { action: pendingAction, userIds });

      if (pendingAction.type === 'delete') {
        // Check if any users are admins (prevent deleting the last admin)
        const { data: admins, error: adminsError } = await supabase
          .from('user_profiles')
          .select('id, role')
          .eq('role', 'admin');

        logger.info('UserList: Checked admin users', { admins, adminsError });

        if (adminsError) {
          logger.error('UserList: Error checking admin users', { error: adminsError });
          throw adminsError;
        }

        const adminIds = new Set(admins?.map(a => a.id) || []);
        const selectedAdmins = userIds.filter(id => adminIds.has(id));

        if (selectedAdmins.length > 0 && selectedAdmins.length >= adminIds.size) {
          logger.error('UserList: Cannot delete all admin users', { selectedAdmins });
          throw new Error('Cannot delete all admin users. At least one admin must remain.');
        }

        // Delete each user using the admin function
        const deletePromises = userIds.map(async (userId) => {
          const { error } = await supabase.rpc('delete_user', { user_id: userId });
          if (error) {
            logger.error('UserList: Error deleting user', { error, userId });
            throw error;
          }
          logger.info('UserList: Successfully deleted user', { userId });
        });

        try {
          await Promise.all(deletePromises);
          logger.info('UserList: Successfully deleted all users', { count: userIds.length });
          toast({
            title: "Users Deleted",
            description: `Successfully deleted ${userIds.length} user${userIds.length === 1 ? '' : 's'}`,
          });
        } catch (error) {
          logger.error('UserList: Error in batch deletion', { error });
          toast({
            variant: "destructive",
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to delete users",
          });
          throw error;
        }
      } else if (pendingAction.type === 'changeRole' && pendingAction.role) {
        logger.info('UserList: Updating user roles', { userIds, newRole: pendingAction.role });
          
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          logger.error('UserList: No access token available');
          throw new Error('No access token available');
        }

        // Update each user's role
        const updatePromises = userIds.map(async (userId) => {
          // const { data: response, error: functionError } = await supabase.functions.invoke('update-user-role', {
          //   body: { 
          //     userId,
          //     role: pendingAction.role
          //   },
          //   headers: {
          //     Authorization: `Bearer ${session.access_token}`
          //   }
          // });
          const { error } = await supabase.rpc('update_user_role', { user_id: userId, new_role: pendingAction.role })

          if (error) {
            logger.error('UserList: Edge function error', { error, userId });
            throw new Error(`Edge function error: ${error.message}`);
          }

          // // Edge functions can return application errors in the response
          // if (response?.error) {
          //   logger.error('UserList: Application error from edge function', { error: response.error, userId });
          //   throw new Error(response.error);
          // }

          // if (!response?.data) {
          //   logger.error('UserList: No data returned from update', { response, userId });
          //   throw new Error('No data returned from update');
          // }

          logger.info('UserList: Successfully updated user role', { 
            userId,
            requestedRole: pendingAction.role,
            // actualRole: response.data.role
          });
        });

        try {
          await Promise.all(updatePromises);
          toast({
            title: "Roles Updated",
            description: `Successfully updated ${userIds.length} user${userIds.length === 1 ? '' : 's'} to ${pendingAction.role}`,
          });
        } catch (error) {
          logger.error('UserList: Error in batch role update', { error });
          toast({
            variant: "destructive",
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to update user roles",
          });
          throw error;
        }
      }

      // Refresh the user list
      logger.info('UserList: Refreshing user list after batch action');
      await fetchUsers();
      setSelectedUsers(new Set());
    } catch (error) {
      logger.error('UserList: Error executing batch action', { 
        error, 
        action: pendingAction,
        selectedUsers: Array.from(selectedUsers),
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
      throw error;
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
    logger.methodExit('UserList.executeBatchAction');
  };

  const handleSingleUserAction = (userId: string, action: BatchAction): void => {
    logger.methodEntry('UserList.handleSingleUserAction', { userId, action });
    setOpenDropdowns(new Set());
    handleBatchAction(action, [userId]);
    logger.methodExit('UserList.handleSingleUserAction');
  };

  const getConfirmationMessage = (): string => {
    if (!pendingAction) return '';
    const count = userIdsToProcess?.length || selectedUsers.size;
    
    if (pendingAction.type === 'delete') {
      return `Are you sure you want to delete ${count} user${count === 1 ? '' : 's'}? This action cannot be undone.`;
    } else if (pendingAction.type === 'changeRole' && pendingAction.role) {
      return `Are you sure you want to change the role of ${count} user${count === 1 ? '' : 's'} to ${pendingAction.role}?`;
    }
    return '';
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
    <div className="space-y-4 mx-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Select
            value={roleFilter}
            onValueChange={(value: RoleFilter) => setRoleFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="service_rep">Service Reps</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={hasOpenTicketsFilter}
            onValueChange={(value: 'all' | 'yes' | 'no') => setHasOpenTicketsFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by open tickets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="yes">Has Open Tickets</SelectItem>
              <SelectItem value="no">No Open Tickets</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedUsers.size > 0 && isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} selected
            </span>
            <Select
              onValueChange={(value: UserRole) => handleBatchRoleChange(value as UserRole)}
            >
              <SelectTrigger className="w-[180px]" data-testid="role-change-trigger">
                <SelectValue placeholder="Change role to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer" data-testid="role-option-customer">Customer</SelectItem>
                <SelectItem value="service_rep" data-testid="role-option-service-rep">Service Rep</SelectItem>
                <SelectItem value="admin" data-testid="role-option-admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={loading}
            >
              Delete Users
            </Button>
          </div>
        )}
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div className="p-1">
          <Table data-testid="user-list" className="w-full border-collapse [&_td]:border-b [&_td]:border-gray-200 dark:[&_td]:border-gray-800 [&_tr:last-child]:border-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('email')}
                >
                  Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow 
                  key={user.id} 
                  data-testid="user-item"
                  className={clsx(
                    'relative h-10 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    selectedUsers.has(user.id) && [
                      'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/30',
                      '[&>td]:border-y [&>td]:border-blue-500 dark:[&>td]:border-blue-400',
                      '[&>td:first-child]:border-l [&>td:first-child]:rounded-l-md',
                      '[&>td:last-child]:border-r [&>td:last-child]:rounded-r-md'
                    ],
                    isAdmin && 'cursor-pointer select-none'
                  )}
                  onClick={(e) => handleRowClick(index, user.id, e)}
                  onMouseDown={() => handleMouseDown(index)}
                  onMouseEnter={() => handleMouseEnter(index)}
                >
                  <TableCell className="px-3 py-2 align-middle">{user.fullName}</TableCell>
                  <TableCell className="px-3 py-2 align-middle">{user.email}</TableCell>
                  <TableCell className="px-3 py-2 align-middle">
                    <Badge
                      variant={
                        user.role === 'admin' 
                          ? 'destructive' 
                          : user.role === 'service_rep' 
                            ? 'default' 
                            : 'secondary'
                      }
                      style={
                        user.role === 'service_rep' 
                          ? { backgroundColor: '#3b82f6', color: 'white' } 
                          : user.role === 'customer'
                            ? { backgroundColor: '#6b7280', color: 'white' }
                            : undefined
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle">
                    {user.openTickets > 0 ? (
                      <Badge className="bg-orange-500">{user.openTickets}</Badge>
                    ) : (
                      <span>0</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle">{user.totalTickets}</TableCell>
                  <TableCell className="px-3 py-2 align-middle">
                    {user.lastTicketDate 
                      ? new Date(user.lastTicketDate).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  {isAdmin && (
                    <TableCell className="px-3 py-2 align-middle">
                      <DropdownMenu 
                        open={openDropdowns.has(user.id)}
                        onOpenChange={(open) => {
                          setOpenDropdowns(prev => {
                            const next = new Set(prev);
                            if (open) {
                              next.add(user.id);
                            } else {
                              next.delete(user.id);
                            }
                            return next;
                          });
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleSingleUserAction(user.id, { 
                              type: 'changeRole', 
                              role: user.role === 'customer' ? 'service_rep' : 'customer' 
                            })}
                          >
                            {user.role === 'customer' ? 'Make Service Rep' : 'Make Customer'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleSingleUserAction(user.id, { type: 'delete' })}
                          >
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={users.length < ITEMS_PER_PAGE || loading}
        >
          Next
        </Button>
      </div>

      <Dialog open={showTicketWarning} onOpenChange={setShowTicketWarning}>
        <DialogContent className="sm:max-w-[425px]" hideCloseButton>
          <DialogHeader>
            <DialogTitle>Warning: Users Have Tickets</DialogTitle>
            <DialogDescription>
              Some of the selected users have open tickets. Deleting these users will:
              <ul className="list-disc list-inside mt-2">
                <li>Remove their access to the system</li>
                <li>Keep their ticket history for record-keeping</li>
                <li>Set their assigned tickets to unassigned</li>
              </ul>
              Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketWarning(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleTicketWarningConfirm}>
              Proceed with Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]" hideCloseButton data-testid="confirm-dialog">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {getConfirmationMessage()}
            </DialogDescription>
          </DialogHeader>
          {errorMessage && (
            <div className="text-red-500 text-sm mt-2">
              {errorMessage}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={(): void => {
                logger.info('UserList: User canceled confirmation dialog');
                setShowConfirmDialog(false);
                setErrorMessage(null);
              }}
              disabled={loading}
              data-testid="confirm-dialog-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={(): void => {
                logger.info('UserList: User confirmed action');
                void executeBatchAction().catch((error): void => {
                  logger.error('UserList: Error executing batch action', { error });
                  setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
                });
              }}
              disabled={loading}
              data-testid="confirm-dialog-confirm"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  logger.methodExit('UserList');
  return result;
}