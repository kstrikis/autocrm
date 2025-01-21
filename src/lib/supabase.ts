import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

logger.info(`Initializing Supabase client for ${supabaseUrl}`);
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key: string) => {
          const value = window.localStorage.getItem(key);
          logger.debug('Getting auth storage item', { key, hasValue: !!value });
          return value;
        },
        setItem: (key: string, value: string) => {
          logger.debug('Setting auth storage item', { key });
          window.localStorage.setItem(key, value);
        },
        removeItem: (key: string) => {
          logger.debug('Removing auth storage item', { key });
          window.localStorage.removeItem(key);
        }
      },
      flowType: 'pkce'
    },
    global: {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'X-Client-Info': 'autocrm-web'
      }
    }
  }
); 