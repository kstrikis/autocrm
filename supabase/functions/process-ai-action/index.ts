import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ChatOpenAI } from 'https://esm.sh/@langchain/openai';
import { PromptTemplate } from 'https://esm.sh/@langchain/core/prompts';
import { JsonOutputFunctionsParser } from 'https://esm.sh/@langchain/core/output_parsers';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI
const openai = new ChatOpenAI({
  openAIApiKey: Deno.env.get('OPENAI_API_KEY')!,
  modelName: 'gpt-4-turbo-preview',
  temperature: 0,
});

// Define function schema for OpenAI
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

const promptTemplate = PromptTemplate.fromTemplate(`
You are an AI assistant helping service representatives manage tickets in an equipment repair CRM system.
Analyze the following input from a service representative and extract the relevant information:

Input: {input}

Based on the input:
1. Identify the customer name
2. Determine if this should be a customer-visible note (default to internal unless clearly meant for customer communication)
3. Extract any status changes or tags that should be added/removed
4. Format the note content professionally

Remember:
- Keep notes professional and clear
- Default to internal notes unless clearly meant for customer communication
- Status changes should be explicit or clearly implied
- Tags should be relevant to equipment/repair context
`);

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
        { status: 403 }
      );
    }

    // Process with LangChain
    const prompt = await promptTemplate.format({ input: input_text });
    const outputParser = new JsonOutputFunctionsParser();

    const result = await openai
      .bind({
      functions: [functionSchema],
      function_call: { name: 'process_service_rep_action' }
      })
      .call([prompt])
      .then(outputParser.parse);

    // Find relevant ticket
    const tickets = await findCustomerTickets(result.customer_name);
    if (!tickets.length) {
    return new Response(
      JSON.stringify({
          error: `No recent tickets found for customer: ${result.customer_name}`
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
        action_type: result.action_type,
        interpreted_action: result,
        requires_approval: userProfile.ai_preferences?.requireApproval ?? true
      })
      .select()
      .single();

    if (actionError) throw actionError;

    // If no approval required, execute immediately
    if (!aiAction.requires_approval) {
      // Execute action based on type
      switch (result.action_type) {
        case 'add_note':
          await supabase.from('ticket_messages').insert({
            ticket_id: tickets[0].id,
            sender_id: user_id,
            content: result.note_content,
            is_internal: !result.is_customer_visible
          });
          break;
        case 'update_status':
          if (result.status_update) {
            await supabase
              .from('tickets')
              .update({ status: result.status_update })
              .eq('id', tickets[0].id);
          }
          break;
        case 'update_tags':
          const currentTags = new Set(tickets[0].tags || []);
          result.tags_to_remove?.forEach(tag => currentTags.delete(tag));
          result.tags_to_add?.forEach(tag => currentTags.add(tag));
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
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('Error processing AI action:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}); 