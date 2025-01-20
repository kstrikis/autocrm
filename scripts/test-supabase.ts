import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'failed-to-get-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyConnection() {
  console.log('Verifying Supabase connection...')
  const { count, error } = await supabase
    .from('users')
    .select('count', { count: 'exact' })

  if (error) {
    throw new Error(`Failed to connect to Supabase: ${error.message}`)
  }

  console.log('Successfully connected to Supabase')
  console.log('Current user count:', count)
}

async function main() {
  try {
    // Verify connection first
    await verifyConnection()
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

main() 