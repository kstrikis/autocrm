-- Create enum for AI action types
CREATE TYPE public.ai_action_type AS ENUM (
  'add_note',
  'update_status',
  'update_tags'
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

-- Add RLS policies for ai_actions
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service reps can view their own AI actions"
  ON public.ai_actions
  FOR SELECT
  USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'service_rep'
    )
  );

CREATE POLICY "Service reps can insert their own AI actions"
  ON public.ai_actions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'service_rep'
    )
  );

CREATE POLICY "Service reps can update their own pending AI actions"
  ON public.ai_actions
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'service_rep'
    )
  );

-- Add user preferences for AI features
ALTER TABLE public.user_profiles
ADD COLUMN ai_preferences JSONB NOT NULL DEFAULT '{
  "requireApproval": true,
  "enableVoiceInput": false,
  "defaultNoteVisibility": "internal"
}'::jsonb;

-- Create function to update AI action status
CREATE OR REPLACE FUNCTION public.update_ai_action_status(
  action_id UUID,
  new_status public.ai_action_status,
  error_msg TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ai_actions
  SET 
    status = new_status,
    error_message = COALESCE(error_msg, error_message),
    executed_at = CASE 
      WHEN new_status IN ('executed', 'failed') THEN now()
      ELSE executed_at
    END,
    updated_at = now()
  WHERE id = action_id
  AND (
    status = 'pending'
    OR (status = 'approved' AND new_status IN ('executed', 'failed'))
  );
END;
$$; 