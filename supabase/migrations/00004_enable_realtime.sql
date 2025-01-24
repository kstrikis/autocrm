-- Create publication for realtime
create publication if not exists supabase_realtime;

-- Enable realtime for tickets table
alter publication supabase_realtime add table tickets; 