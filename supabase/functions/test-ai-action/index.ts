import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { ChatOpenAI } from 'npm:@langchain/openai'
import { StringOutputParser } from 'npm:@langchain/core/output_parsers'
import { ChatPromptTemplate } from 'npm:@langchain/core/prompts'
import { RunnableSequence } from 'npm:@langchain/core/runnables'
import { Client } from 'npm:langsmith'

// Configure LangSmith for tracing
const client = new Client({
  apiKey: Deno.env.get("LANGCHAIN_API_KEY"),
  endpoint: Deno.env.get("LANGCHAIN_ENDPOINT") || "https://api.smith.langchain.com",
});

// Enable tracing
const LANGCHAIN_PROJECT = Deno.env.get("LANGCHAIN_PROJECT") || "default";
const LANGCHAIN_TRACING_V2 = Deno.env.get("LANGCHAIN_TRACING_V2") || "true";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize LangChain components with tracing
const chatModel = new ChatOpenAI({
  openAIApiKey: Deno.env.get('OPENAI_API_KEY'),
  temperature: 0
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Echo back the user's message exactly as received, prefixed with 'ECHO: '"],
  ["human", "{input}"]
]);

const outputParser = new StringOutputParser();

// Create a simple chain that just echoes the input
const chain = RunnableSequence.from([
  prompt,
  chatModel,
  outputParser
]).withConfig({
  tags: ["test-ai-action"],
  runName: "Echo Test Chain"
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { input_text, user_id } = await req.json();
    console.log('Test AI Action received:', { input_text, user_id });

    // Run the chain with tracing metadata
    const result = await chain.invoke({
      input: input_text
    }, {
      metadata: {
        userId: user_id,
        timestamp: new Date().toISOString()
      }
    });

    console.log('LangChain result:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test function processed input using LangChain',
        parsed_result: result
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