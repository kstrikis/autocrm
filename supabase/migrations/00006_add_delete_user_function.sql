-- Create admin function to delete users
create or replace function delete_user(user_id uuid)
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
    raise exception 'Only administrators can delete users';
  end if;

  -- Delete from auth.users (this will cascade to user_profiles due to our foreign key)
  delete from auth.users where id = user_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function delete_user to authenticated;
