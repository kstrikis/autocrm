import { writeFileSync } from 'fs';
import { logger } from '../src/lib/logger';
import 'dotenv/config';

try {
  logger.methodEntry('create-cypress-env');
  
  const { API_URL, ANON_KEY, SERVICE_ROLE_KEY } = process.env;
  
  if (!API_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables. Make sure to run supabase:env first.');
  }
  
  const cypressEnv = {
    SUPABASE_URL: API_URL,
    SUPABASE_ANON_KEY: ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY
  };
  
  logger.info('Creating cypress.env.json with Supabase credentials');
  writeFileSync('cypress.env.json', JSON.stringify(cypressEnv, null, 2));
  logger.info('Successfully created cypress.env.json');
  
  logger.methodExit('create-cypress-env');
} catch (error) {
  logger.error('Failed to create cypress.env.json:', error);
  process.exit(1);
}
