// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js'

const SEED_ADMIN_TOKEN = Deno.env.get('SEED_ADMIN_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SEED_ADMIN_TOKEN) {
  throw new Error('Missing required environment variables');
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

async function seedUsers(supabase: any) {
  console.log('Starting user seeding process');
  
  try {
    let newUsersCreated = false;
    
    for (const user of demoUsers) {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('full_name', user.data.full_name)
        .single();

      if (!existingUser) {
        newUsersCreated = true;
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: user.data
        });

        if (error) {
          console.error(`Failed to create user ${user.email}:`, error.message);
        } else {
          console.log(`Created user ${user.email} with ID: ${data.user.id}`);
        }
      } else {
        console.log(`User ${user.email} already exists, skipping`);
      }
    }

    // Only create demo tickets if we created new users
    if (newUsersCreated) {
      console.log('New users were created, proceeding with ticket creation');
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
            console.error(`Failed to create ticket ${ticket.title}:`, error.message);
          } else {
            console.log(`Created ticket: ${ticket.title}`);
          }
        }
      }
    } else {
      console.log('No new users created, skipping ticket creation');
    }

    return { success: true, message: 'Seeding completed successfully' };
  } catch (error) {
    console.error('Error in seedUsers:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  // Verify the admin token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== SEED_ADMIN_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  const result = await seedUsers(supabase);

  return new Response(
    JSON.stringify(result),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/seed-users' \
    --header 'Authorization: Bearer your-seed-admin-token' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
