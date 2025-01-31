// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "jsr:@std/http@^0.224.0"
import { createClient } from 'npm:@supabase/supabase-js'
import { ChatOpenAI } from 'npm:@langchain/openai'
import { ChatPromptTemplate } from 'npm:@langchain/core/prompts'
import { Client } from 'npm:langsmith'
import { JsonOutputFunctionsParser } from 'npm:langchain/output_parsers'

// Define function schema for OpenAI first
const functionSchema = {
  name: 'interpret_service_rep_input',
  description: 'Interpret service rep input and convert to structured actions',
  parameters: {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action_type: {
              type: 'string',
              enum: ['add_note', 'update_status', 'update_tags', 'assign_ticket'],
              description: 'Type of action to perform'
            },
            ticket_id: {
              type: 'string',
              pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
              description: 'UUID of the ticket to perform action on'
            },
            interpreted_action: {
              type: 'object',
              properties: {
                note_content: {
                  type: 'string',
                  description: 'Content of the note to add'
                },
                is_customer_visible: {
                  type: 'boolean',
                  description: 'Whether the note should be visible to customers'
                },
                status_update: {
                  type: 'string',
                  description: 'New status to set for the ticket'
                },
                tags_to_add: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to add to the ticket'
                },
                tags_to_remove: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to remove from the ticket'
                },
                assign_to: {
                  type: 'string',
                  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
                  description: 'UUID of the user to assign the ticket to'
                }
              }
            },
            confidence_score: {
              type: 'number',
              description: 'How confident the AI is about this interpretation (0-1)'
            }
          },
          required: ['action_type', 'ticket_id', 'interpreted_action', 'confidence_score']
        }
      }
    },
    required: ['actions']
  }
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

// Update the prompt template to reflect the new context structure
const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an AI assistant helping service representatives manage tickets in an equipment repair CRM system.
Your task is to analyze the service representative's input and suggest appropriate actions to take.

You have access to recent tickets with their customer information. Each ticket includes:
- Title and description
- Current status and tags
- Customer information (id, name, company)
- Current assignment (assigned_to may be null)
- Last update time

Available actions:
1. add_note: Add internal or customer-visible notes
2. update_status: Change ticket status
3. update_tags: Add or remove tags
4. assign_ticket: Assign ticket to a service rep (IMPORTANT: Use this for ANY assignment request)

IMPORTANT ASSIGNMENT RULES:
- When you see words like "assign", "give me", "take", or similar assignment requests:
  * ALWAYS use the assign_ticket action type
  * For self-assignment requests (e.g. "give me", "I'll take"), set assign_to to the requesting service rep's ID ({user_id})
  * For reassignment requests, verify the target user_id is provided
  * Include a status update to 'open' if the ticket is new or unassigned
  * Use a high confidence score (0.9+) for clear assignment requests
- Examples of assignment requests:
  * "assign me this ticket" -> assign_to: {user_id} (self-assignment)
  * "give me that ticket" -> assign_to: {user_id} (self-assignment)
  * "I'll take this one" -> assign_to: {user_id} (self-assignment)
  * "assign the dark mode ticket to me" -> assign_to: {user_id} (self-assignment)
  * "let me handle this" -> assign_to: {user_id} (self-assignment)

For each action you suggest:
1. Determine the specific ticket it applies to
2. Identify the type of action needed (especially for assignments)
3. Extract relevant details for that action type
4. Assign a confidence score (0-1) for your interpretation

Guidelines:
- You can suggest multiple actions from a single input
- Each action must reference a specific ticket
- Keep notes professional and clear
- Default to internal notes unless clearly meant for customer communication
- Status changes should be explicit or clearly implied
- Tags should be relevant to equipment/repair context
- Assign lower confidence scores when context is ambiguous
- When customer is referenced by first/last name only, match against customer names in tickets
- For assignments, be aware that:
  * ticket.customer.id is the customer who owns the ticket
  * ticket.assigned_to is the current assignee (if any)
  * {user_id} is the ID of the service rep making this request`],
  ["human", `Context:
Recent Tickets: {tickets}

Service Rep Input: {input}

Your user_id is: {user_id}`]
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
  console.log('Starting process-ai-action function');
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
    const { input_text, user_id } = await req.json();
    console.log('Received request:', { input_text, user_id });

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
    console.log('User profile:', { role: userProfile.role, hasAiPrefs: !!userProfile.ai_preferences });

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

    // Gather context for the AI - join tickets with customer information
    console.log('Fetching recent tickets for context');
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        title,
        description,
        status,
        tags,
        created_at,
        updated_at,
        assigned_to,
        customer:user_profiles!tickets_customer_id_fkey(
          id,
          full_name,
          company
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      throw ticketsError;
    }
    console.log(`Found ${tickets.length} recent tickets`);

    // Format tickets for the LLM context
    console.log('Formatting tickets for LLM');
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      tags: ticket.tags,
      assigned_to: ticket.assigned_to,
      customer: {
        id: ticket.customer.id,
        name: ticket.customer.full_name,
        company: ticket.customer.company
      },
      last_update: ticket.updated_at
    }));
    console.log('Formatted ticket sample:', formattedTickets[0]);

    // Process with LangChain
    console.log('Preparing LangChain prompt');
    const formattedPrompt = await prompt.formatMessages({
      input: input_text,
      tickets: JSON.stringify(formattedTickets),
      user_id: user_id
    });
    console.log('Formatted prompt:', formattedPrompt);

    // Run the model with function calling and tracing metadata
    console.log('Invoking LangChain model');
    const result = await model.invoke(formattedPrompt, {
      functions: [functionSchema],
      function_call: { name: 'interpret_service_rep_input' },
      metadata: {
        userId: user_id,
        timestamp: new Date().toISOString(),
        projectName: projectName
      },
      tags: ["process-ai-action", "edge-function"]
    });
    console.log('LangChain result:', result);

    // Extract the function call result
    if (!result.additional_kwargs?.function_call?.arguments) {
      console.error('No function call result in response:', result);
      throw new Error('No function call result received from AI');
    }

    // Parse the function arguments
    console.log('Parsing AI response');
    const parsedResult = JSON.parse(result.additional_kwargs.function_call.arguments);
    console.log('Parsed result:', parsedResult);

    // Create AI action records
    console.log(`Creating ${parsedResult.actions.length} AI actions`);
    const aiActions = [];
    for (const action of parsedResult.actions) {
      console.log('Processing action:', action);

      // For assignment actions, we need to update both the ticket and create an action record
      if (action.action_type === 'assign_ticket') {
        console.log('Processing assignment action');
        const updatePromises = [];

        // Update ticket assignment
        if (action.interpreted_action.assign_to) {
          console.log('Updating ticket assignment:', action.interpreted_action.assign_to);
          updatePromises.push(
            supabase
              .from('tickets')
              .update({ 
                assigned_to: action.interpreted_action.assign_to
              })
              .eq('id', action.ticket_id)
          );
        }

        // Create the action record
        const { data: aiAction, error: actionError } = await supabase
          .from('ai_actions')
          .insert({
            user_id,
            ticket_id: action.ticket_id,
            input_text,
            action_type: action.action_type,
            interpreted_action: action.interpreted_action,
            requires_approval: userProfile.ai_preferences?.requireApproval ?? true
          })
          .select()
          .single();

        if (actionError) {
          console.error('Error creating AI action:', actionError);
          throw actionError;
        }

        // Wait for all updates to complete
        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          console.error('Errors updating ticket:', errors);
          throw errors[0].error;
        }

        console.log('Created AI action with assignment:', aiAction);
        aiActions.push(aiAction);
      } else {
        // Handle other action types as before
        const { data: aiAction, error: actionError } = await supabase
          .from('ai_actions')
          .insert({
            user_id,
            ticket_id: action.ticket_id,
            input_text,
            action_type: action.action_type,
            interpreted_action: action.interpreted_action,
            requires_approval: userProfile.ai_preferences?.requireApproval ?? true
          })
          .select()
          .single();

        if (actionError) {
          console.error('Error creating AI action:', actionError);
          throw actionError;
        }
        console.log('Created AI action:', aiAction);
        aiActions.push(aiAction);
      }
    }

    // Ensure LangSmith traces are flushed
    console.log('Flushing LangSmith traces');
    await client.flush();
    console.log('Traces flushed successfully');

    console.log('Request completed successfully');
    return new Response(
      JSON.stringify({ actions: aiActions }),
      { 
        status: 200,
        headers: responseHeaders
      }
    );

  } catch (error) {
    console.error('Error processing AI action:', error);
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // Ensure traces are flushed even on error
    try {
      console.log('Attempting to flush traces after error');
      await client.flush();
      console.log('Traces flushed successfully after error');
    } catch (cleanupError) {
      console.error('Error flushing traces:', {
        name: cleanupError.name,
        message: cleanupError.message,
        stack: cleanupError.stack
      });
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: responseHeaders
      }
    );
  }
}); 