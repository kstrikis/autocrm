-- Add company column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN company text;

-- Add GraphQL field name alias
COMMENT ON COLUMN public.user_profiles.company is E'@graphql({"name": "company"})';

-- Update handle_new_user function to include company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
    role,
    company
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email),
    default_role,
    new.raw_user_meta_data->>'company'
  );
  return new;
end;
$$;

-- Backfill company data for existing customers from raw_user_meta_data
UPDATE public.user_profiles
SET company = auth.users.raw_user_meta_data->>'company'
FROM auth.users
WHERE user_profiles.id = users.id
AND user_profiles.role = 'customer'
AND auth.users.raw_user_meta_data->>'company' IS NOT NULL; 