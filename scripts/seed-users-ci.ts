import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { logger } from '../src/lib/node-logger';
import { TicketInput } from '../src/types/ticket';
import { execSync } from 'child_process';

async function getSupabaseCredentials() {
  try {
    const { API_URL, SERVICE_ROLE_KEY } = process.env;

    if (!API_URL || !SERVICE_ROLE_KEY) {
      logger.error('Missing environment variables');
      // Fallback to default values
      return {
        supabaseUrl: 'http://127.0.0.1:54321',
        serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
      };
    }

    logger.info('Got Supabase credentials from env:', { url: API_URL });
    return { supabaseUrl: API_URL, serviceRoleKey: SERVICE_ROLE_KEY };
  } catch (error) {
    logger.error('Error in getSupabaseCredentials:', error);
    throw error;
  }
}

const demoUsers = [
  {
    email: 'customer1@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Alice Customer',
      display_name: 'Alice C.',
      role: 'customer'
    }
  },
  {
    email: 'customer2@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Bob Customer',
      display_name: 'Bob C.',
      role: 'customer'
    }
  },
  {
    email: 'service1@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Carol Service',
      display_name: 'Carol S.',
      role: 'service_rep'
    }
  },
  {
    email: 'service2@example.com',
    password: 'Password123!',
    data: {
      full_name: 'David Service',
      display_name: 'David S.',
      role: 'service_rep'
    }
  },
  {
    email: 'admin@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Eva Admin',
      display_name: 'Eva A.',
      role: 'admin'
    }
  }
];

const demoTickets: TicketInput[] = [
  {
    title: 'Cannot access my account',
    description: 'I keep getting an error when trying to log in',
    priority: 'high',
    status: 'new',
    tags: ['login', 'error'],
    metadata: { browser: 'Chrome', os: 'Windows' }
  },
  {
    title: 'Feature request: Dark mode',
    description: 'Would love to have a dark mode option',
    priority: 'low',
    status: 'open',
    tags: ['feature-request', 'ui'],
    metadata: { importance: 'enhancement' }
  },
  {
    title: 'App crashes on startup',
    description: 'After the latest update, the app crashes immediately',
    priority: 'urgent',
    status: 'pendingInternal',
    tags: ['crash', 'critical'],
    metadata: { version: '1.2.0', platform: 'iOS' }
  }
];

async function seedUsers() {
  logger.methodEntry('seedUsers');
  
  try {
    // Get Supabase credentials
    const { supabaseUrl, serviceRoleKey } = await getSupabaseCredentials();

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    });

    for (const user of demoUsers) {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('full_name', user.data.full_name)
        .single();

      if (!existingUser) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: user.data
        });

        if (error) {
          logger.error(`Failed to create user ${user.email}:`, error.message);
        } else {
          logger.info(`Created user ${user.email} with ID: ${data.user.id}`);
        }
      } else {
        logger.info(`User ${user.email} already exists, skipping`);
      }
    }

    // Create some demo tickets
    const { data: customers } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'customer');

    const { data: serviceReps } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'service_rep');

    if (customers && customers.length > 0 && serviceReps && serviceReps.length > 0) {
      for (const ticket of demoTickets) {
        // Prepare ticket data in frontend format
        const ticketData: TicketInput = {
          ...ticket,
          customerId: customers[Math.floor(Math.random() * customers.length)].id,
          assignedTo: Math.random() > 0.5 ? serviceReps[Math.floor(Math.random() * serviceReps.length)].id : null
        };

        // Validate ticket data
        const requiredFields = ['title', 'description', 'customerId', 'status', 'priority'];
        const missingFields = requiredFields.filter(field => !ticketData[field as keyof TicketInput]);
        if (missingFields.length) {
          logger.error(`Missing required fields for ticket ${ticketData.title}:`, { fields: missingFields });
          continue;
        }

        // Validate status
        const validStatuses = ['new', 'open', 'pendingCustomer', 'pendingInternal', 'resolved', 'closed'];
        if (!validStatuses.includes(ticketData.status)) {
          logger.error(`Invalid status for ticket ${ticketData.title}:`, { status: ticketData.status });
          continue;
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(ticketData.priority)) {
          logger.error(`Invalid priority for ticket ${ticketData.title}:`, { priority: ticketData.priority });
          continue;
        }

        // Convert to database format for insertion
        const dbTicket = {
          title: ticketData.title,
          description: ticketData.description,
          status: ticketData.status.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
          priority: ticketData.priority,
          customer_id: ticketData.customerId,
          assigned_to: ticketData.assignedTo,
          tags: ticketData.tags || [],
          metadata: ticketData.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('tickets')
          .insert(dbTicket);

        if (error) {
          logger.error(`Failed to create ticket ${ticketData.title}:`, { error: error.message });
        } else {
          logger.info(`Created ticket: ${ticketData.title}`);
        }
      }
    }
  } catch (error) {
    logger.error('Error in seedUsers:', error);
  }

  logger.methodExit('seedUsers');
}

seedUsers()
  .catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  })
  .finally(() => {
    logger.info('Seed script completed');
    process.exit(0);
  });
