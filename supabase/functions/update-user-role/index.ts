import { serve } from 'https://deno.fresh.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

interface RequestBody {
  userId: string
  role: string
}

serve(async (req) => {
  try {
    // Create a Supabase client with the admin key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405 }
      )
    }

    // Get the request body
    const { userId, role } = await req.json() as RequestBody

    // Verify the user exists and is an admin
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser()
    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }

    // Get admin's role from user_profiles
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (adminProfileError || adminProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin role required' }),
        { status: 401 }
      )
    }

    // Update the user's metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { role } }
    )

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})
