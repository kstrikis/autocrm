import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../src/lib/node-logger.ts';

const supabaseUrl = Cypress.env('SUPABASE_URL');
const supabaseKey = Cypress.env('SUPABASE_ANON_KEY');
const supabaseServiceKey = Cypress.env('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables in cypress.env.json');
}

// Regular client for normal operations
export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'autocrm-web-test'
    }
  }
});

// Admin client for operations requiring service role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    flowType: 'none',
    storage: null
  },
  global: {
    headers: {
      'X-Client-Info': 'autocrm-web-test-admin'
    }
  }
}); 