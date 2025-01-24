-- Drop existing publication if it exists
drop publication if exists supabase_realtime;

-- Create publication for realtime
create publication supabase_realtime;

-- Enable realtime for tickets table
alter publication supabase_realtime add table tickets;

-- Note: If we need to add more tables later, we can use:
-- alter publication supabase_realtime add table new_table_name; 