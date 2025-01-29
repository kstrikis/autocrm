import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditTicketForm } from '@/components/tickets/EditTicketForm';
import MessageInterface from '@/components/MessageInterface';
import { Ticket, TicketStatus, TicketPriority } from '@/types/ticket';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

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

interface TicketDetails extends Ticket {
  customerName: string;
  assignedToName: string | null;
}

export default function TicketDetailsPage(): React.ReactElement {
  logger.methodEntry('TicketDetailsPage');
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    // Get current user
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [])

  const fetchTicket = async (): Promise<void> => {
    logger.methodEntry('TicketDetailsPage.fetchTicket');
    try {
      setLoading(true);
      
      if (!ticketId) {
        throw new Error('No ticket ID provided');
      }

      const { data, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:user_profiles!tickets_customer_id_fkey(id, full_name),
          assigned:user_profiles!tickets_assigned_to_fkey(id, full_name)
        `)
        .eq('id', ticketId)
        .single();

      if (ticketError) {
        logger.error('TicketDetailsPage: Error fetching ticket', { error: ticketError });
        throw ticketError;
      }

      if (!data) {
        logger.error('TicketDetailsPage: Ticket not found', { ticketId });
        throw new Error('Ticket not found');
      }

      logger.debug('TicketDetailsPage: Mapping ticket data', {
        ticketId: data.id,
        assigned: data.assigned,
        assignedTo: data.assigned_to
      });

      const ticketDetails: TicketDetails = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status as Exclude<TicketStatus, 'all'>,
        priority: data.priority as Exclude<TicketPriority, 'all'>,
        customerId: data.customer_id,
        customerName: data.customer?.full_name || 'Unknown',
        assignedTo: data.assigned_to,
        assignedToName: data.assigned?.full_name || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        resolvedAt: data.resolved_at,
        closedAt: data.closed_at,
        tags: data.tags || [],
        metadata: data.metadata || {},
      };

      setTicket(ticketDetails);
      logger.info('TicketDetailsPage: Ticket fetched successfully', { ticketId });
    } catch (err) {
      logger.error('TicketDetailsPage: Error in fetchTicket', { error: err });
      setError(err as Error);
    } finally {
      setLoading(false);
      logger.methodExit('TicketDetailsPage.fetchTicket');
    }
  };

  useEffect(() => {
    void fetchTicket();

    // Set up real-time subscription
    const channel = supabase.channel('ticket-details');
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          logger.info('TicketDetailsPage: Received ticket update', { 
            event: payload.eventType,
            new: payload.new,
            old: payload.old
          });
          void fetchTicket();
        }
      )
      .subscribe((status) => {
        logger.info('TicketDetailsPage: Subscription status', { status });
      });

    return (): void => {
      void channel.unsubscribe();
    };
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error: {error.message}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/tickets')}
            className="mt-4"
          >
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Ticket not found</p>
          <Button
            variant="outline"
            onClick={() => navigate('/tickets')}
            className="mt-4"
          >
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  const result = (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{ticket.title}</h1>
            <div className="flex gap-2 items-center text-sm text-gray-500">
              <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>By {ticket.customerName}</span>
              <span>•</span>
              <Badge className={statusColors[ticket.status]}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge className={priorityColors[ticket.priority]}>
                {ticket.priority}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/tickets')}
            >
              Back to Tickets
            </Button>
            <EditTicketForm
              ticket={ticket}
              onUpdate={fetchTicket}
            >
              <Button>Edit Ticket</Button>
            </EditTicketForm>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <p className="whitespace-pre-wrap">{ticket.description}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
              <dd className="flex items-center gap-2">
                <span>{ticket.assignedToName || 'Unassigned'}</span>
                {!ticket.assignedTo && currentUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      logger.methodEntry('assignToMe');
                      try {
                        const { error: updateError } = await supabase
                          .from('tickets')
                          .update({ assigned_to: currentUser.id })
                          .eq('id', ticket.id);

                        if (updateError) {
                          logger.error('Failed to assign ticket', { error: updateError });
                          return;
                        }

                        void fetchTicket();
                        logger.info('Successfully assigned ticket', { ticketId: ticket.id });
                      } catch (err) {
                        logger.error('Error assigning ticket', { error: err });
                      }
                      logger.methodExit('assignToMe');
                    }}
                  >
                    Assign to Me
                  </Button>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
            </div>
            {ticket.resolvedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolved At</dt>
                <dd>{new Date(ticket.resolvedAt).toLocaleString()}</dd>
              </div>
            )}
            {ticket.closedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Closed At</dt>
                <dd>{new Date(ticket.closedAt).toLocaleString()}</dd>
              </div>
            )}
            {ticket.tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tags</dt>
                <dd className="flex gap-1">
                  {ticket.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Conversation</h2>
          <MessageInterface 
            ticketId={ticket.id} 
            isServiceRep={ticket.assignedTo === currentUser?.id}
            assignedTo={ticket.assignedTo || null}
            onAssignmentChange={fetchTicket}
          />
        </div>
      </div>
    </div>
  );

  logger.methodExit('TicketDetailsPage');
  return result;
} 