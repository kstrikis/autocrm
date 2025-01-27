-- Create admin function to update user roles
create or replace function update_user_role(user_id uuid, new_role public.user_role)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the executing user is an admin
  if not exists (
    select 1 from public.user_profiles
    where id = auth.uid()
    and role = 'admin'::public.user_role
  ) then
    raise exception 'Only administrators can update user roles';
  end if;

  -- Update the user's role in user_profiles
  update public.user_profiles
  set role = new_role
  where id = user_id;

  -- Update the user's metadata in auth.users
  update auth.users
  set raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role::text)
  )
  where id = user_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function update_user_role to authenticated;
