-- Create enum for user roles
create type public.user_role as enum ('customer', 'service_rep', 'admin');

-- Create the user_profiles table
create table public.user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'customer'::user_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add GraphQL field name aliases
comment on column public.user_profiles.user_id is E'@graphql({"name": "userId"})';
comment on column public.user_profiles.full_name is E'@graphql({"name": "fullName"})';
comment on column public.user_profiles.created_at is E'@graphql({"name": "createdAt"})';
comment on column public.user_profiles.updated_at is E'@graphql({"name": "updatedAt"})';

-- Create indexes
create index user_profiles_user_id_idx on public.user_profiles (user_id);
create index user_profiles_email_idx on public.user_profiles (email);
create index user_profiles_role_idx on public.user_profiles (role);

-- Enable Row Level Security (RLS)
alter table public.user_profiles enable row level security;

-- Create policies
create policy "User profiles are viewable by authenticated users"
  on public.user_profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (
    -- Regular users can only update non-role fields
    (role IS NOT DISTINCT FROM (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()))
    OR
    -- Admins can update everything
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to handle user profile creation on auth.user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$;

-- Create trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant access to authenticated users
grant usage on schema public to authenticated;
grant all on public.user_profiles to authenticated; 