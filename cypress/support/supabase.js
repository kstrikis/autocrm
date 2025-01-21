import { createClient } from '@supabase/supabase-js';
import { logger } from '../../src/lib/node-logger.ts';

const supabaseUrl = Cypress.env('SUPABASE_URL');
const supabaseKey = Cypress.env('SUPABASE_ANON_KEY');
const supabaseServiceKey = Cypress.env('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables in cypress.env.json');
}

logger.info(`Initializing Supabase test clients for ${supabaseUrl}`);

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage
  }
});

// Admin client for operations requiring service role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}); 