import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Simple debug logger with timestamps
const debug = (event: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: `message-create:${event}`,
    message,
    data: data || {}
  }))
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const origin = req.headers.get('Origin') || ''
  const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
  
  if (Deno.env.get('ENVIRONMENT') === 'production') {
    allowedOrigins.push('https://autocrm.kriss.cc')
  }

  if (!allowedOrigins.includes(origin)) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { 
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json'
  }

  try {
    if (req.method !== 'POST') {
      debug('invalid-method', 'Method not allowed', { method: req.method })
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: responseHeaders
      })
    }

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      debug('auth-missing', 'Missing authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: responseHeaders
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (!user || authError) {
      debug('auth-failure', 'JWT validation failed', { error: authError?.message })
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: responseHeaders
      })
    }

    const { content, ticketId, isInternal, attachments } = await req.json()
    
    debug('request-received', 'Processing new message request', {
      contentLength: content?.length,
      ticketId,
      isInternal
    })

    // Validate input
    if (!content || content.length > 2000 || !ticketId) {
      debug('validation-failed', 'Invalid message content', { 
        contentLength: content?.length,
        valid: content?.length > 0 && content?.length <= 2000,
        hasTicketId: !!ticketId
      })
      return new Response(JSON.stringify({ error: 'Invalid message content' }), { status: 400 })
    }

    // Verify user has access to ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('customer_id,assigned_to')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      debug('ticket-lookup-failed', 'Ticket not found', { 
        error: ticketError?.message,
        ticketId
      })
      return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 })
    }

    const isValidParticipant = user.id === ticket.customer_id || user.id === ticket.assigned_to
    if (!isValidParticipant) {
      debug('access-denied', 'User not authorized for ticket', {
        userId: user.id,
        ticketCustomer: ticket.customer_id,
        ticketAssigned: ticket.assigned_to
      })
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 })
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        content,
        is_internal: isInternal,
        attachments: attachments || []
      })
      .select()
      .single()

    if (insertError) {
      debug('insert-failed', 'Message creation error', {
        error: insertError.message,
        stack: insertError.stack
      })
      return new Response(JSON.stringify({ error: 'Failed to create message' }), { status: 500 })
    }

    debug('message-created', 'Successfully created message', {
      messageId: message.id,
      ticketId,
      isInternal,
      attachmentCount: attachments?.length || 0
    })

    return new Response(JSON.stringify(message), { 
      status: 201,
      headers: responseHeaders
    })

  } catch (error) {
    debug('unhandled-exception', 'Critical error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: responseHeaders
      }
    )
  }
}) 