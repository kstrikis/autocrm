-- Create function to update user role with proper transaction handling
create or replace function public.update_user_role(
  p_user_id uuid,
  p_role user_role
)
returns public.user_profiles
language plpgsql
security definer
as $$
declare
  v_user public.user_profiles;
begin
  -- Start transaction
  begin
    -- Update user_profiles table
    update public.user_profiles
    set 
      role = p_role,
      updated_at = timezone('utc'::text, now())
    where id = p_user_id
    returning * into v_user;

    -- Update auth.users metadata
    update auth.users
    set 
      raw_user_meta_data = raw_user_meta_data || 
        jsonb_build_object('role', p_role::text),
      updated_at = timezone('utc'::text, now())
    where id = p_user_id;

    return v_user;
  exception
    when others then
      raise exception 'Error updating user role: %', sqlerrm;
  end;
end;
$$;
