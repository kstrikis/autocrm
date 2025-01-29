-- Drop the old policy
drop policy if exists "User profiles are viewable by service reps and admins" on public.user_profiles;

-- Create new policy that also allows viewing profiles referenced in tickets
create policy "User profiles are viewable by participants"
  on public.user_profiles for select
  using (
    -- Service reps and admins can view all profiles
    ((auth.jwt() -> 'user_metadata' ->> 'role')::user_role in ('service_rep', 'admin'))
    -- Users can view their own profile
    or id = auth.uid()
    -- Users can view profiles of people involved in their tickets
    or exists (
      select 1 from tickets
      where (
        -- Can view customer of tickets assigned to me
        (tickets.assigned_to = auth.uid() and tickets.customer_id = user_profiles.id)
        -- Can view assignee of my tickets
        or (tickets.customer_id = auth.uid() and tickets.assigned_to = user_profiles.id)
      )
    )
  ); 