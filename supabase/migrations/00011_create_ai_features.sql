-- Create enum for AI action types
CREATE TYPE public.ai_action_type AS ENUM (
  'add_note',
  'update_status',
  'update_tags',
  'assign_ticket'
);

-- Create enum for AI action status
CREATE TYPE public.ai_action_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'executed',
  'failed'
);

-- Create table for AI actions
CREATE TABLE public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  action_type public.ai_action_type NOT NULL,
  interpreted_action JSONB NOT NULL,
  status public.ai_action_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  executed_at TIMESTAMPTZ,
  requires_approval BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

-- Dead simple policy - if you're a service rep, you can see all actions
CREATE POLICY "Service reps can see all actions"
ON public.ai_actions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'service_rep'
  )
);

-- Service reps can update their own actions
CREATE POLICY "Service reps can update their own actions"
ON public.ai_actions
FOR UPDATE
TO public
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'service_rep'
  )
);

-- Service reps can insert their own actions
CREATE POLICY "Service reps can insert their own actions"
ON public.ai_actions
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'service_rep'
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_actions; 