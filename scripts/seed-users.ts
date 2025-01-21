import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from '../src/lib/node-logger';

dotenv.config();

const supabaseUrl = process.env.DEV_SUPABASE_URL;
const supabaseServiceKey = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  },
});

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

const demoTickets = [
  {
    title: 'Cannot access my account',
    description: 'I keep getting an error when trying to log in',
    priority: 'high',
    status: 'new'
  },
  {
    title: 'Feature request: Dark mode',
    description: 'Would love to have a dark mode option',
    priority: 'low',
    status: 'open'
  },
  {
    title: 'App crashes on startup',
    description: 'After the latest update, the app crashes immediately',
    priority: 'urgent',
    status: 'pending_internal'
  }
];

async function seedUsers() {
  logger.methodEntry('seedUsers');
  
  try {
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
        const customerId = customers[Math.floor(Math.random() * customers.length)].id;
        const assignedTo = Math.random() > 0.5 ? serviceReps[Math.floor(Math.random() * serviceReps.length)].id : null;

        const { error } = await supabase
          .from('tickets')
          .insert({
            ...ticket,
            customer_id: customerId,
            assigned_to: assignedTo
          });

        if (error) {
          logger.error(`Failed to create ticket ${ticket.title}:`, error.message);
        } else {
          logger.info(`Created ticket: ${ticket.title}`);
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