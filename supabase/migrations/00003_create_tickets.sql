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
create table if not exists public.tickets (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  customer_id uuid not null references public.user_profiles(id),
  assigned_to uuid references public.user_profiles(id),
  status ticket_status not null default 'new',
  priority ticket_priority not null default 'medium',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
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

-- Enable RLS
alter table public.tickets enable row level security;

-- Create policies
create policy "Tickets are viewable by service reps and admins"
  on public.tickets
  for select using (
    ((auth.jwt() -> 'user_metadata' ->> 'role')::user_role in ('service_rep', 'admin'))
    or customer_id = auth.uid()
  );

create policy "Customers can create their own tickets"
  on public.tickets
  for insert
  with check (
    auth.uid() = customer_id and
    assigned_to is null
  );

create policy "Service reps and admins can update tickets"
  on public.tickets
  for update using (
    ((auth.jwt() -> 'user_metadata' ->> 'role')::user_role in ('service_rep', 'admin'))
  );

-- Create trigger for updated_at
create trigger set_tickets_updated_at
  before update on public.tickets
  for each row
  execute function set_updated_at();

-- Grant access to authenticated users
grant usage on schema public to authenticated;
grant select, insert, update on public.tickets to authenticated;
grant usage on type public.ticket_status to authenticated;
grant usage on type public.ticket_priority to authenticated; 