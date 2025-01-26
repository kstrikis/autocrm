-- Add delete policy for user_profiles
create policy "Only admins can delete users"
  on public.user_profiles
  for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role')::user_role = 'admin');

-- Grant delete permission to authenticated users
grant delete on public.user_profiles to authenticated;

-- Update tickets foreign key constraints to set null on delete
alter table public.tickets
  drop constraint tickets_assigned_to_fkey,
  add constraint tickets_assigned_to_fkey
    foreign key (assigned_to)
    references public.user_profiles(id)
    on delete set null;

alter table public.tickets
  drop constraint tickets_customer_id_fkey,
  add constraint tickets_customer_id_fkey
    foreign key (customer_id)
    references public.user_profiles(id)
    on delete cascade;
