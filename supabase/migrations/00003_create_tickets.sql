-- Create enum for ticket status
create type public.ticket_status as enum (
  'new',
  'open',
  'pending_customer',
  'pending_internal',
  'resolved',
  'closed'
);

-- Create enum for ticket priority
create type public.ticket_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create tickets table
create table public.tickets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  customer_id uuid not null references public.user_profiles(id),
  assigned_to uuid references public.user_profiles(id),
  status ticket_status not null default 'new'::ticket_status,
  priority ticket_priority not null default 'medium'::ticket_priority,
  tags text[] default array[]::text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone
);

-- Add GraphQL field name aliases
comment on column public.tickets.customer_id is E'@graphql({"name": "customerId"})';
comment on column public.tickets.assigned_to is E'@graphql({"name": "assignedTo"})';
comment on column public.tickets.created_at is E'@graphql({"name": "createdAt"})';
comment on column public.tickets.updated_at is E'@graphql({"name": "updatedAt"})';
comment on column public.tickets.resolved_at is E'@graphql({"name": "resolvedAt"})';
comment on column public.tickets.closed_at is E'@graphql({"name": "closedAt"})';

-- Create indexes
create index tickets_customer_id_idx on public.tickets (customer_id);
create index tickets_assigned_to_idx on public.tickets (assigned_to);
create index tickets_status_idx on public.tickets (status);
create index tickets_priority_idx on public.tickets (priority);
create index tickets_created_at_idx on public.tickets (created_at);
create index tickets_tags_gin_idx on public.tickets using gin (tags);

-- Set up Row Level Security (RLS)
alter table public.tickets enable row level security;

-- Create policies
create policy "Tickets are viewable by service reps and admins"
  on public.tickets for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('service_rep', 'admin')
    )
    or customer_id = auth.uid()
  );

create policy "Customers can create their own tickets"
  on public.tickets for insert
  with check (
    auth.uid() = customer_id and
    assigned_to is null -- Customers cannot assign tickets
  );

create policy "Service reps and admins can update tickets"
  on public.tickets for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('service_rep', 'admin')
    )
  );

-- Create trigger for updated_at
create trigger set_tickets_updated_at
  before update on public.tickets
  for each row
  execute function set_updated_at();

-- Grant access to authenticated users
grant usage on schema public to authenticated;
grant all on public.tickets to authenticated; 