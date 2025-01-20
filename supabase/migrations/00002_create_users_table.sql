-- Drop existing table and its dependencies
drop table if exists public.users cascade;

-- Create the users table
create table public.users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  is_guest boolean not null default true,
  status text not null default 'offline'::text check (status in ('online', 'away', 'offline')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add GraphQL field name aliases
comment on column public.users.is_guest is E'@graphql({"name": "isGuest"})';
comment on column public.users.created_at is E'@graphql({"name": "createdAt"})';
comment on column public.users.updated_at is E'@graphql({"name": "updatedAt"})';
comment on column public.users.last_seen is E'@graphql({"name": "lastSeen"})';

-- Create indexes after the table exists
create index users_name_idx on public.users (name);
create index users_status_idx on public.users (status);
create index users_is_guest_idx on public.users (is_guest);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies
create policy "Users are viewable by everyone"
  on public.users for select
  using (true);

create policy "Users can insert themselves"
  on public.users for insert
  with check (true);

create policy "Users can update their own status and last_seen"
  on public.users for update
  using (true)
  with check (true);

-- Grant access to authenticated users
grant usage on schema public to authenticated;
grant all on public.users to authenticated;

-- Grant access to anon users (for guest functionality)
grant usage on schema public to anon;
grant select, insert, update on public.users to anon; 