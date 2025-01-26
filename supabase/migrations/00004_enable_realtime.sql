-- Create publication for realtime if it doesn't exist
do $$ 
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- Enable realtime for tables if not already enabled
do $$
declare
  table_name text;
  tables_to_add text[] := array['tickets', 'user_profiles'];
begin
  foreach table_name in array tables_to_add
  loop
    if not exists (
      select 1 
      from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table %I', table_name);
    end if;
  end loop;
end
$$;

-- Note: If we need to add more tables later, we can use:
-- alter publication supabase_realtime add table new_table_name;