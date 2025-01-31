import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "jsr:@std/http@^0.224.0"
import { createClient } from 'npm:@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get allowed origins based on environment
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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Starting execute-ai-action function');
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = getAllowedOrigins();
  console.log('Request origin:', origin, 'Allowed:', allowedOrigins.includes(origin));
  
  // Set the actual origin in the CORS headers if it's allowed
  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { 
      headers: {
        ...responseHeaders,
        'Content-Type': 'text/plain'
      }
    });
  }

  try {
    const { action_id, user_id, approve } = await req.json();
    console.log('Received request:', { action_id, user_id, approve });

    // Validate user is a service rep
    console.log('Validating service rep:', user_id);
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError) {
      console.error('User validation error:', userError);
      throw userError;
    }

    if (userProfile?.role !== 'service_rep') {
      console.error('Unauthorized role:', userProfile?.role);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 403,
          headers: responseHeaders
        }
      );
    }

    // Get the action to execute
    const { data: action, error: actionError } = await supabase
      .from('ai_actions')
      .select('*')
      .eq('id', action_id)
      .single();

    if (actionError) {
      console.error('Error fetching action:', actionError);
      throw actionError;
    }

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action not found' }),
        { 
          status: 404,
          headers: responseHeaders
        }
      );
    }

    if (action.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Action is not pending' }),
        { 
          status: 400,
          headers: responseHeaders
        }
      );
    }

    // If rejecting, just update the status
    if (!approve) {
      const { error: updateError } = await supabase
        .from('ai_actions')
        .update({ 
          status: 'rejected',
          executed_at: new Date().toISOString()
        })
        .eq('id', action_id);

      if (updateError) {
        console.error('Error rejecting action:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ status: 'rejected' }),
        { 
          status: 200,
          headers: responseHeaders
        }
      );
    }

    // Execute the action based on type
    try {
      switch (action.action_type) {
        case 'assign_ticket':
          if (action.interpreted_action.assign_to) {
            const { error: assignError } = await supabase
              .from('tickets')
              .update({ 
                assigned_to: action.interpreted_action.assign_to,
                status: action.interpreted_action.status_update || 'open'
              })
              .eq('id', action.ticket_id);

            if (assignError) throw assignError;
          }
          break;

        case 'update_status':
          if (action.interpreted_action.status_update) {
            const { error: statusError } = await supabase
              .from('tickets')
              .update({ 
                status: action.interpreted_action.status_update
              })
              .eq('id', action.ticket_id);

            if (statusError) throw statusError;
          }
          break;

        case 'update_tags':
          const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('tags')
            .eq('id', action.ticket_id)
            .single();

          if (ticketError) throw ticketError;

          let tags = ticket.tags || [];
          if (action.interpreted_action.tags_to_add) {
            tags = [...new Set([...tags, ...action.interpreted_action.tags_to_add])];
          }
          if (action.interpreted_action.tags_to_remove) {
            tags = tags.filter(t => !action.interpreted_action.tags_to_remove?.includes(t));
          }

          const { error: tagsError } = await supabase
            .from('tickets')
            .update({ tags })
            .eq('id', action.ticket_id);

          if (tagsError) throw tagsError;
          break;

        case 'add_note':
          if (action.interpreted_action.note_content) {
            const { error: noteError } = await supabase
              .from('ticket_messages')
              .insert({
                ticket_id: action.ticket_id,
                sender_id: user_id,
                content: action.interpreted_action.note_content,
                is_internal: !action.interpreted_action.is_customer_visible
              });

            if (noteError) throw noteError;

            // Also update ticket status if provided
            if (action.interpreted_action.status_update) {
              const { error: statusError } = await supabase
                .from('tickets')
                .update({ status: action.interpreted_action.status_update })
                .eq('id', action.ticket_id);

              if (statusError) throw statusError;
            }
          }
          break;

        default:
          throw new Error(`Unsupported action type: ${action.action_type}`);
      }

      // Update action status to executed
      const { error: updateError } = await supabase
        .from('ai_actions')
        .update({ 
          status: 'executed',
          executed_at: new Date().toISOString()
        })
        .eq('id', action_id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ status: 'executed' }),
        { 
          status: 200,
          headers: responseHeaders
        }
      );

    } catch (error) {
      // If execution fails, update action status to failed
      const { error: updateError } = await supabase
        .from('ai_actions')
        .update({ 
          status: 'failed',
          error_message: error.message,
          executed_at: new Date().toISOString()
        })
        .eq('id', action_id);

      if (updateError) {
        console.error('Error updating failed action:', updateError);
      }

      throw error;
    }

  } catch (error) {
    console.error('Error executing AI action:', error);
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: responseHeaders
      }
    );
  }
});