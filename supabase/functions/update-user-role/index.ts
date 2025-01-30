// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js'

const getAllowedOrigins = () => {
  const origins = ['https://autocrm.kriss.cc'];
  
  // Allow localhost origins in development
  if (Deno.env.get('ENVIRONMENT') !== 'production') {
    origins.push(
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:54321',
      'http://127.0.0.1:54321'
    );
  }
  
  return origins;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // We'll validate the origin in the request handler
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface UpdateRoleBody {
  userId: string;
  role: 'customer' | 'service_rep' | 'admin';
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = getAllowedOrigins();
  
  // Check if the origin is allowed
  if (!allowedOrigins.includes(origin)) {
    console.log('Origin not allowed:', origin);
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Set the actual origin in the CORS headers
  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the JWT from authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header:', authHeader);
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify the JWT and get the user
    const jwt = authHeader.split(' ')[1];
    console.log('JWT token:', jwt.substring(0, 20) + '...');
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(jwt);
    console.log('Auth result:', { user: adminUser, error: authError });
    if (authError || !adminUser) {
      console.log('Invalid token error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token', details: authError }),
        { 
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get admin's role from user_profiles
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    console.log('Admin profile:', { profile: adminProfile, error: adminProfileError });
    if (adminProfileError || adminProfile.role !== 'admin') {
      console.log('Not an admin:', { role: adminProfile?.role, error: adminProfileError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin role required' }),
        { 
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the request body
    const { userId, role } = await req.json() as UpdateRoleBody;

    // Get current admins to prevent removing last admin
    const { data: admins, error: adminsError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin');

    if (adminsError) {
      console.log('Error fetching admins:', adminsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching admins' }),
        { 
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If changing from admin to another role, ensure it's not the last admin
    if (role !== 'admin' && admins.length === 1 && admins[0].id === userId) {
      console.log('Attempting to remove last admin');
      return new Response(
        JSON.stringify({ error: 'Cannot remove last admin role' }),
        { 
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update the user's role directly using the service role client
    const { data: updatedUser, error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.log('Error updating role:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { 
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Successfully updated user role:', updatedUser);
    return new Response(
      JSON.stringify({ data: updatedUser }),
      { 
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
