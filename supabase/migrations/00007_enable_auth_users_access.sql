-- Create a view that joins user_profiles with auth.users
create or replace view user_profiles_with_email as
  select 
    p.id,
    p.full_name,
    p.display_name,
    p.avatar_url,
    p.role,
    p.status,
    p.last_seen_at,
    p.created_at,
    p.updated_at,
    u.email
  from public.user_profiles p
  inner join auth.users u on u.id = p.id
  where 
    -- Service reps and admins can view all users
    (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('service_rep', 'admin')
    -- Users can view their own data
    or p.id = auth.uid();

-- Grant select access on the view to authenticated users
grant select on user_profiles_with_email to authenticated;
