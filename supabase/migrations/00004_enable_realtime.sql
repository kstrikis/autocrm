-- Drop existing publication if it exists
drop publication if exists supabase_realtime;

-- Create publication for realtime
create publication supabase_realtime;

-- Enable realtime for tickets and user_profiles tables
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table user_profiles;

-- Note: If we need to add more tables later, we can use:
-- alter publication supabase_realtime add table new_table_name;