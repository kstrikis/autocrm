import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// Get CORS headers for a specific request
const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Fetch all user names grouped by role
async function getUserNames(): Promise<{ [key: string]: string[] }> {
  const { data, error } = await supabaseClient
    .from('user_profiles')
    .select('full_name, role');

  if (error) {
    console.error('Error fetching user names:', error);
    return {};
  }

  // Group names by role
  return data.reduce((acc, user) => {
    if (!user.full_name) return acc;
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user.full_name);
    return acc;
  }, {} as { [key: string]: string[] });
}

console.log('Audio transcription function loaded')

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio_base64 } = await req.json()
    
    if (!audio_base64) {
      throw new Error('No audio data provided')
    }

    // Get all user names grouped by role
    const usersByRole = await getUserNames();
    console.log('Found users by role:', usersByRole);
    
    // Create a more detailed prompt with all users
    const initialPrompt = `This is a conversation about our CRM system. Here are the people that might be mentioned:
${Object.entries(usersByRole).map(([role, names]) => 
  `${role}s: ${names.join(', ')}`
).join('\n')}
Please transcribe the following audio with special attention to these names.`;

    console.log('Using initial prompt:', initialPrompt);

    // Convert base64 to blob
    const binaryStr = atob(audio_base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' })
    console.log('Audio blob created:', { 
      type: audioBlob.type, 
      size: audioBlob.size 
    });

    // Create form data
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    formData.append('model', 'whisper-1')
    formData.append('initial_prompt', initialPrompt)

    console.log('Sending request to OpenAI with:', {
      model: 'whisper-1',
      fileName: 'recording.webm',
      fileType: audioBlob.type,
      fileSize: audioBlob.size,
      initialPrompt
    });

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: formData
    })

    const data = await response.json()
    console.log('OpenAI API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    });

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
}) 