create table ticket_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id),
  content text not null check (length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  is_internal boolean not null default false,
  attachments text[] default array[]::text[]
);

-- Add GraphQL aliases for camelCase compatibility
comment on column ticket_messages.ticket_id is 'GraphQL @graphql(name: "ticketId")';
comment on column ticket_messages.sender_id is 'GraphQL @graphql(name: "senderId")';
comment on column ticket_messages.created_at is 'GraphQL @graphql(name: "createdAt")';
comment on column ticket_messages.is_internal is 'GraphQL @graphql(name: "isInternal")';

-- Create indexes (removed CONCURRENTLY)
create index ticket_messages_ticket_id_idx 
  on ticket_messages (ticket_id);

create index ticket_messages_created_at_idx 
  on ticket_messages (created_at);

create index ticket_messages_sender_id_idx 
  on ticket_messages (sender_id);

alter table ticket_messages enable row level security;

create policy "Participants can view messages" 
  on ticket_messages for select using (
    exists (
      select 1 from tickets 
      where tickets.id = ticket_messages.ticket_id
      and (
        tickets.customer_id = (select id from public.user_profiles where id = auth.uid())
        or tickets.assigned_to = (select id from public.user_profiles where id = auth.uid())
      )
    )
  );

create policy "Authorized users can insert messages"
  on ticket_messages for insert with check (
    sender_id = (select id from public.user_profiles where id = auth.uid())
    and exists (
      select 1 from tickets 
      where tickets.id = ticket_messages.ticket_id
      and (
        (tickets.customer_id = (select id from public.user_profiles where id = auth.uid()) and is_internal = false)
        or (tickets.assigned_to = (select id from public.user_profiles where id = auth.uid()) and is_internal = true)
      )
    )
  );

-- Enable realtime for ticket_messages
alter publication supabase_realtime add table ticket_messages; 