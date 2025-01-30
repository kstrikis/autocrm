// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { ChatOpenAI } from 'npm:@langchain/openai'
import { ChatPromptTemplate } from 'npm:@langchain/core/prompts'
import { Client } from 'npm:langsmith'

// Configure LangSmith for tracing
const client = new Client({
  apiKey: Deno.env.get("LANGCHAIN_API_KEY"),
  endpoint: Deno.env.get("LANGCHAIN_ENDPOINT") || "https://api.smith.langchain.com",
});

// Get project name from env
const projectName = Deno.env.get("LANGCHAIN_PROJECT") || "autocrm";

// CORS headers - allow both localhost:5173 and 127.0.0.1:54321
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

// Initialize LangChain model with tracing enabled
const model = new ChatOpenAI({
  openAIApiKey: Deno.env.get('OPENAI_API_KEY'),
  temperature: 0,
  configuration: {
    baseOptions: {
      headers: {
        "Langchain-Project": projectName,
        "Langchain-Trace-V2": "true"
      }
    }
  }
});

// Create a simple prompt
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Echo back the user's message exactly as received, prefixed with 'ECHO: '"],
  ["human", "{input}"]
]);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { input_text, user_id } = await req.json();
    console.log('Test AI Action received:', { input_text, user_id });

    // Format the prompt
    const formattedPrompt = await prompt.formatMessages({
      input: input_text
    });

    // Run the model with tracing metadata
    const result = await model.invoke(formattedPrompt, {
      metadata: {
        userId: user_id,
        timestamp: new Date().toISOString(),
        projectName: projectName
      },
      tags: ["test-ai-action", "edge-function"]
    });

    console.log('LangChain result:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test input processed successfully',
        parsed_result: result.content
      }),
      { 
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