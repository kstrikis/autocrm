export type TicketStatus = 'new' | 'open' | 'pending_customer' | 'pending_internal' | 'resolved' | 'closed' | 'all';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent' | 'all';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  customerId: string;
  assignedTo?: string;
  status: Exclude<TicketStatus, 'all'>;
  priority: Exclude<TicketPriority, 'all'>;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface TicketListItem extends Pick<Ticket, 'id' | 'title' | 'status' | 'priority' | 'createdAt' | 'customerId' | 'assignedTo'> {} 