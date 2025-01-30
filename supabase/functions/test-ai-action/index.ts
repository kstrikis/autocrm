import { serve } from 'https://deno.land/std/http/server.ts'
import OpenAI from 'https://esm.sh/openai'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only create OpenAI client if API key is available
const openai = Deno.env.get('OPENAI_API_KEY') ? 
  new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') }) : 
  null;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { input_text, user_id } = await req.json();
    console.log('Test AI Action received:', { input_text, user_id });

    let result;
    if (openai) {
      // Use OpenAI if available
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that parses user commands into structured data. Extract the action and relevant information from the input."
          },
          {
            role: "user",
            content: input_text
          }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      });
      result = completion.choices[0].message.content;
    } else {
      // Return mock response for testing
      result = JSON.stringify({
        action: "test_response",
        input: input_text,
        timestamp: new Date().toISOString()
      });
    }

    console.log('Parsed result:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test function processed input',
        parsed_result: result
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('Error in test function:', error);
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