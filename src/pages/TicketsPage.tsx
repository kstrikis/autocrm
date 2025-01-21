import { TicketQueue } from '@/components/tickets/TicketQueue';
import { logger } from '@/lib/logger';

export default function TicketsPage(): React.ReactElement {
  logger.methodEntry('TicketsPage');

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Support Tickets</h1>
        </div>
        <TicketQueue />
      </div>
    </div>
  );
} 