-- Drop all existing policies
DROP POLICY IF EXISTS "Service reps can see all actions" ON public.ai_actions;
DROP POLICY IF EXISTS "Service reps can update their own actions" ON public.ai_actions;
DROP POLICY IF EXISTS "Service reps can insert their own actions" ON public.ai_actions;
DROP POLICY IF EXISTS "User profiles are viewable by participants" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Tickets are viewable by service reps and admins" ON public.tickets;
DROP POLICY IF EXISTS "Customers can create their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update tickets" ON public.tickets;

-- Create super permissive policies for development
CREATE POLICY "Super permissive select on ai_actions"
ON public.ai_actions FOR SELECT
TO public
USING (true);

CREATE POLICY "Super permissive insert on ai_actions"
ON public.ai_actions FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Super permissive update on ai_actions"
ON public.ai_actions FOR UPDATE
TO public
USING (true);

CREATE POLICY "Super permissive select on user_profiles"
ON public.user_profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Super permissive insert on user_profiles"
ON public.user_profiles FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Super permissive update on user_profiles"
ON public.user_profiles FOR UPDATE
TO public
USING (true);

CREATE POLICY "Super permissive select on tickets"
ON public.tickets FOR SELECT
TO public
USING (true);

CREATE POLICY "Super permissive insert on tickets"
ON public.tickets FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Super permissive update on tickets"
ON public.tickets FOR UPDATE
TO public
USING (true); 