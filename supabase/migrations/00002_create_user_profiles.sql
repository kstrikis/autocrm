-- Create enum for user roles
create type public.user_role as enum ('customer', 'service_rep', 'admin');

-- Create enum for user status
create type public.user_status as enum ('online', 'away', 'offline');

-- Create the user_profiles table that extends auth.users
create table public.user_profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  full_name text not null,
  display_name text,
  avatar_url text,
  role user_role not null default 'customer'::user_role,
  status user_status not null default 'offline'::user_status,
  last_seen_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add GraphQL field name aliases
comment on column public.user_profiles.full_name is E'@graphql({"name": "fullName"})';
comment on column public.user_profiles.display_name is E'@graphql({"name": "displayName"})';
comment on column public.user_profiles.avatar_url is E'@graphql({"name": "avatarUrl"})';
comment on column public.user_profiles.last_seen_at is E'@graphql({"name": "lastSeenAt"})';
comment on column public.user_profiles.created_at is E'@graphql({"name": "createdAt"})';
comment on column public.user_profiles.updated_at is E'@graphql({"name": "updatedAt"})';

-- Create indexes
create index user_profiles_role_idx on public.user_profiles (role);
create index user_profiles_status_idx on public.user_profiles (status);
create index user_profiles_last_seen_at_idx on public.user_profiles (last_seen_at);

-- Set up Row Level Security (RLS)
alter table public.user_profiles enable row level security;

-- Create policies
create policy "User profiles are viewable by service reps and admins"
  on public.user_profiles for select
  using (
    -- Service reps and admins can view all profiles
    (auth.jwt() -> 'user_metadata' ->> 'role')::user_role in ('service_rep', 'admin')
    -- Customers can only view their own profile
    or id = auth.uid()
  );

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (
    -- Regular users can only update non-role fields
    (role = (select role from public.user_profiles where id = auth.uid()))
    OR
    -- Admins can update everything
    (auth.jwt() -> 'user_metadata' ->> 'role')::user_role = 'admin'
  );

-- Create trigger for updated_at
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function set_updated_at();

-- Create function to handle user profile creation on auth.user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_role user_role;
begin
  -- Set default role to customer if not provided
  default_role := coalesce(
    (new.raw_user_meta_data->>'role')::user_role,
    'customer'::user_role
  );

  insert into public.user_profiles (
    id,
    full_name,
    display_name,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email),
    default_role
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