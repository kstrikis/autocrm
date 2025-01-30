// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "jsr:@std/http@^0.224.0"
import { createClient } from 'npm:@supabase/supabase-js'
import { ChatOpenAI } from 'npm:@langchain/openai'
import { ChatPromptTemplate } from 'npm:@langchain/core/prompts'
import { Client } from 'npm:langsmith'
import { JsonOutputFunctionsParser } from 'npm:langchain/output_parsers'

// Define function schema for OpenAI first (before using it in model initialization)
const functionSchema = {
  name: 'process_service_rep_action',
  description: 'Process a service representative\'s action on a ticket',
  parameters: {
    type: 'object',
    properties: {
      action_type: {
        type: 'string',
        enum: ['add_note', 'update_status', 'update_tags'],
        description: 'The type of action to perform',
      },
      customer_name: {
        type: 'string',
        description: 'The name of the customer mentioned in the input',
      },
      note_content: {
        type: 'string',
        description: 'The content of the note to be added',
      },
      is_customer_visible: {
        type: 'boolean',
        description: 'Whether the note should be visible to the customer',
      },
      status_update: {
        type: 'string',
        enum: ['new', 'open', 'pending_customer', 'pending_internal', 'resolved', 'closed'],
        description: 'The new status to set for the ticket',
      },
      tags_to_add: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to add to the ticket',
      },
      tags_to_remove: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to remove from the ticket',
      },
    },
    required: ['action_type', 'customer_name'],
  },
};

// Configure LangSmith for tracing
const client = new Client({
  apiKey: Deno.env.get("LANGCHAIN_API_KEY"),
  endpoint: Deno.env.get("LANGCHAIN_ENDPOINT") || "https://api.smith.langchain.com",
});

// Get project name from env
const projectName = Deno.env.get("LANGCHAIN_PROJECT") || "autocrm";

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

// CORS headers - we'll validate origin in the request handler
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // We'll set this dynamically based on the request
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize LangChain model with tracing enabled
const model = new ChatOpenAI({
  openAIApiKey: Deno.env.get('OPENAI_API_KEY'),
  temperature: 0,
  modelName: 'gpt-4-turbo-preview',
  configuration: {
    baseOptions: {
      headers: {
        "Langchain-Project": projectName,
        "Langchain-Trace-V2": "true"
      }
    }
  }
});

// Create prompt template for service rep actions
const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an AI assistant helping service representatives manage tickets in an equipment repair CRM system.
Your task is to analyze the service representative's input and extract relevant information about actions to take.

You should:
1. Identify the customer name mentioned
2. Determine if any notes should be added (and if they should be customer-visible)
3. Detect any status changes needed
4. Identify any tags that should be added or removed

Remember:
- Keep notes professional and clear
- Default to internal notes unless clearly meant for customer communication
- Status changes should be explicit or clearly implied
- Tags should be relevant to equipment/repair context`],
  ["human", "{input}"]
]);

async function findCustomerTickets(customerName: string) {
  const { data: customers, error: customerError } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('role', 'customer')
    .ilike('full_name', `%${customerName}%`);

  if (customerError) throw customerError;
  if (!customers?.length) return [];

  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .in('customer_id', customers.map(c => c.id))
    .order('created_at', { ascending: false })
    .limit(5);

  if (ticketError) throw ticketError;
  return tickets || [];
}

serve(async (req) => {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = getAllowedOrigins();
  
  // Set the actual origin in the CORS headers if it's allowed
  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...responseHeaders,
        'Content-Type': 'text/plain'
      }
    });
  }

  try {
    const { input_text, user_id } = await req.json();

    // Validate user is a service rep
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || userProfile?.role !== 'service_rep') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 403,
          headers: responseHeaders
        }
      );
    }

    // Process with LangChain
    const formattedPrompt = await prompt.formatMessages({
      input: input_text
    });

    // Run the model with function calling and tracing metadata
    const result = await model.invoke(formattedPrompt, {
      functions: [functionSchema],
      function_call: { name: 'process_service_rep_action' },
      metadata: {
        userId: user_id,
        timestamp: new Date().toISOString(),
        projectName: projectName
      },
      tags: ["process-ai-action", "edge-function"]
    });

    // Extract the function call result
    if (!result.additional_kwargs?.function_call?.arguments) {
      throw new Error('No function call result received from AI');
    }

    // Parse the function arguments
    const parsedResult = JSON.parse(result.additional_kwargs.function_call.arguments);

    // Find relevant ticket
    const tickets = await findCustomerTickets(parsedResult.customer_name);
    if (!tickets.length) {
    return new Response(
      JSON.stringify({
          error: `No recent tickets found for customer: ${parsedResult.customer_name}`
      }),
        { status: 404 }
      );
    }

    // Create AI action record
    const { data: aiAction, error: actionError } = await supabase
      .from('ai_actions')
      .insert({
        user_id,
        ticket_id: tickets[0].id,
        input_text,
        action_type: parsedResult.action_type,
        interpreted_action: parsedResult,
        requires_approval: userProfile.ai_preferences?.requireApproval ?? true
      })
      .select()
      .single();

    if (actionError) throw actionError;

    // If no approval required, execute immediately
    if (!aiAction.requires_approval) {
      // Execute action based on type
      switch (parsedResult.action_type) {
        case 'add_note':
          await supabase.from('ticket_messages').insert({
            ticket_id: tickets[0].id,
            sender_id: user_id,
            content: parsedResult.note_content,
            is_internal: !parsedResult.is_customer_visible
          });
          break;
        case 'update_status':
          if (parsedResult.status_update) {
            await supabase
              .from('tickets')
              .update({ status: parsedResult.status_update })
              .eq('id', tickets[0].id);
          }
          break;
        case 'update_tags':
          const currentTags = new Set(tickets[0].tags || []);
          parsedResult.tags_to_remove?.forEach(tag => currentTags.delete(tag));
          parsedResult.tags_to_add?.forEach(tag => currentTags.add(tag));
          await supabase
            .from('tickets')
            .update({ tags: Array.from(currentTags) })
            .eq('id', tickets[0].id);
          break;
      }

      await supabase.rpc('update_ai_action_status', {
        action_id: aiAction.id,
        new_status: 'executed'
      });
    }

    return new Response(
      JSON.stringify(aiAction),
      { 
        status: 200,
        headers: responseHeaders
      }
    );

  } catch (error) {
    console.error('Error processing AI action:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: responseHeaders
      }
    );
  }
}); 