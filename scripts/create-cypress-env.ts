import { writeFileSync } from 'fs';
import 'dotenv/config';

try {
  console.log('🔍 Creating cypress.env.json');
  
  const { API_URL, ANON_KEY, SERVICE_ROLE_KEY } = process.env;
  
  if (!API_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables. Make sure to run supabase:env first.');
  }
  
  const cypressEnv = {
    SUPABASE_URL: API_URL,
    SUPABASE_ANON_KEY: ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY
  };
  
  console.log('📝 Writing cypress.env.json with Supabase credentials');
  writeFileSync('cypress.env.json', JSON.stringify(cypressEnv, null, 2));
  console.log('✅ Successfully created cypress.env.json');
  
} catch (error) {
  console.error('❌ Failed to create cypress.env.json:', error);
  process.exit(1);
}
