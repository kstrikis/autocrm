import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  testId?: string;
}

interface Metrics {
  openTickets: number;
  highPriorityTickets: number;
  avgResponseTime: string;
  activeCustomers: number;
  newCustomersThisWeek: number;
  resolvedTickets: number;
}

interface TicketMessageResponse {
  created_at: string;
  ticket: {
    created_at: string;
  }[];
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, isLoading, testId }) => (
  <div className="bg-white rounded-lg shadow p-6" data-testid={testId}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="mt-1">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-8 w-24 bg-gray-200 rounded"></div>
              {subtitle && <div className="h-4 w-32 bg-gray-200 rounded mt-2"></div>}
            </div>
          ) : (
            <>
              <p className="text-3xl font-semibold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="text-gray-400">
        {icon}
      </div>
    </div>
  </div>
);

export const DashboardMetrics: React.FC = () => {
  logger.methodEntry('DashboardMetrics');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMetrics = async (): Promise<void> => {
      try {
        logger.info('Fetching dashboard metrics');
        
        // Get open tickets count and high priority tickets
        const { data: openTicketsData, error: openTicketsError } = await supabase
          .from('tickets')
          .select('id, priority', { count: 'exact' })
          .in('status', ['new', 'open', 'pending_customer', 'pending_internal']);

        if (openTicketsError) {
          logger.error('Error fetching open tickets:', { error: openTicketsError });
          throw openTicketsError;
        }

        const highPriorityCount = openTicketsData?.filter(ticket => 
          ticket.priority === 'high' || ticket.priority === 'urgent'
        ).length || 0;

        // Get average response time (time between ticket creation and first response)
        const { data: messageData, error: messageError } = await supabase
          .from('ticket_messages')
          .select(`
            created_at,
            ticket:tickets(created_at)
          `)
          .order('created_at', { ascending: true });

        if (messageError) {
          logger.error('Error fetching message data:', { error: messageError });
          throw messageError;
        }

        // Calculate average response time
        const responseTimes = (messageData as unknown as TicketMessageResponse[] | null)?.map(msg => {
          const ticketCreatedAt = new Date(msg.ticket[0]?.created_at || msg.created_at);
          const firstResponseAt = new Date(msg.created_at);
          return firstResponseAt.getTime() - ticketCreatedAt.getTime();
        }) || [];

        const avgResponseTime = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / (1000 * 60 * 60)) // Convert to hours
          : 0;

        // Get active customers count
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: activeCustomersData, error: customersError } = await supabase
          .from('user_profiles')
          .select('id, created_at')
          .eq('role', 'customer');

        if (customersError) {
          logger.error('Error fetching customers:', { error: customersError });
          throw customersError;
        }

        const newCustomers = activeCustomersData.filter(customer => 
          new Date(customer.created_at) > oneWeekAgo
        ).length;

        // Get resolved tickets count
        const { data: resolvedData, error: resolvedError } = await supabase
          .from('tickets')
          .select('id')
          .eq('status', 'resolved');

        if (resolvedError) {
          logger.error('Error fetching resolved tickets:', { error: resolvedError });
          throw resolvedError;
        }

        setMetrics({
          openTickets: openTicketsData?.length || 0,
          highPriorityTickets: highPriorityCount,
          avgResponseTime: `${avgResponseTime}h`,
          activeCustomers: activeCustomersData?.length || 0,
          newCustomersThisWeek: newCustomers,
          resolvedTickets: resolvedData?.length || 0
        });

      } catch (error) {
        logger.error('Error fetching metrics:', { error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
    
    // Subscribe to realtime updates
    const ticketsSubscription = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tickets' 
      }, async (): Promise<void> => {
        await fetchMetrics();
      })
      .subscribe();

    return (): void => {
      void ticketsSubscription.unsubscribe();
    };
  }, []);

  const isServiceRep = user?.user_metadata?.role === 'service_rep';
  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="metrics-grid">
      <MetricCard
        title="Open Tickets"
        value={metrics?.openTickets || 0}
        subtitle={`${metrics?.highPriorityTickets || 0} high priority`}
        isLoading={loading}
        testId="metric-open-tickets"
        icon={
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" strokeWidth="2"/>
          </svg>
        }
      />
      {(isServiceRep || isAdmin) && (
        <MetricCard
          title="Average Response Time"
          value={metrics?.avgResponseTime || '0h'}
          subtitle="Last 7 days"
          isLoading={loading}
          testId="metric-response-time"
          icon={
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }
        />
      )}
      {isAdmin && (
        <MetricCard
          title="Active Customers"
          value={metrics?.activeCustomers || 0}
          subtitle={`${metrics?.newCustomersThisWeek || 0} new this week`}
          isLoading={loading}
          testId="metric-active-customers"
          icon={
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          }
        />
      )}
      {!isAdmin && (
        <MetricCard
          title="Resolved Tickets"
          value={metrics?.resolvedTickets || 0}
          subtitle="Total"
          isLoading={loading}
          testId="metric-resolved-tickets"
          icon={
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        />
      )}
    </div>
  );
};

export default DashboardMetrics; 