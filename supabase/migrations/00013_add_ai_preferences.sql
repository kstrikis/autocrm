-- Add ai_preferences column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ai_preferences jsonb DEFAULT jsonb_build_object(
  'requireApproval', true,
  'enableVoiceInput', false,
  'defaultNoteVisibility', 'internal'
);

-- Add GraphQL field name alias
COMMENT ON COLUMN public.user_profiles.ai_preferences IS E'@graphql({"name": "aiPreferences"})';

-- Update existing rows to have default preferences if they don't already have them
UPDATE public.user_profiles 
SET ai_preferences = jsonb_build_object(
  'requireApproval', true,
  'enableVoiceInput', false,
  'defaultNoteVisibility', 'internal'
)
WHERE ai_preferences IS NULL;

-- Drop the recursive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create new non-recursive update policy using JWT metadata
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  CASE 
    -- Admins can update everything
    WHEN (auth.jwt() -> 'user_metadata' ->> 'role')::user_role = 'admin' THEN true
    -- Regular users can update any field except role
    ELSE (
      role = (auth.jwt() -> 'user_metadata' ->> 'role')::user_role
    )
  END
);

-- Fix recursive policies in ai_actions table
DROP POLICY IF EXISTS "Service reps can see all actions" ON public.ai_actions;
DROP POLICY IF EXISTS "Service reps can update their own actions" ON public.ai_actions;
DROP POLICY IF EXISTS "Service reps can insert their own actions" ON public.ai_actions;

-- Recreate policies using jwt metadata instead of querying user_profiles
CREATE POLICY "Service reps can see all actions"
ON public.ai_actions
FOR SELECT
TO public
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role')::user_role = 'service_rep'
);

CREATE POLICY "Service reps can update their own actions"
ON public.ai_actions
FOR UPDATE
TO public
USING (
  user_id = auth.uid()
  AND (auth.jwt() -> 'user_metadata' ->> 'role')::user_role = 'service_rep'
);

CREATE POLICY "Service reps can insert their own actions"
ON public.ai_actions
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid()
  AND (auth.jwt() -> 'user_metadata' ->> 'role')::user_role = 'service_rep'
); 