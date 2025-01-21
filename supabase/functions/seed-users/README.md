# Seed Users Edge Function

This Edge Function provides a secure way to seed demo users and tickets in both development and production environments.

## Setup

1. Configure environment files:
   - `.env.local` - Local development environment variables
   - `.env` - Production environment variables

2. Make sure your environment variables are set:
   ```bash
   export SEED_ADMIN_TOKEN=your-secure-token
   export SUPABASE_URL=your-supabase-url
   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   export SUPABASE_PROJECT_URL=https://your-project-ref.supabase.co  # For production
   ```

## Available Scripts

The following npm scripts are available for managing the seeding function:

```bash
# Start the function locally using .env.local
npm run seed:serve:local

# Start the function locally using production .env
npm run seed:serve:prod

# Deploy the function to Supabase
npm run seed:deploy

# Run the seeding locally
npm run seed:run:local

# Run the seeding in production
npm run seed:run:prod
```

The run commands use curl under the hood with this structure:
```bash
# Local
curl -i --location --request POST "http://localhost:54321/functions/v1/seed-users" \
  --header "Authorization: Bearer $SEED_ADMIN_TOKEN" \
  --header "Content-Type: application/json"

# Production
curl -i --location --request POST "$SUPABASE_PROJECT_URL/functions/v1/seed-users" \
  --header "Authorization: Bearer $SEED_ADMIN_TOKEN" \
  --header "Content-Type: application/json"
```

Note: The environment variables are referenced with `$VARIABLE_NAME` syntax and the commands use double quotes (`"`) to ensure proper shell expansion.

## Usage

### Local Development

1. Start the function locally:
   ```bash
   npm run seed:serve:local
   ```

2. In another terminal, run the seeding:
   ```bash
   npm run seed:run:local
   ```

### Production Deployment

1. Deploy the function:
   ```bash
   npm run seed:deploy
   ```

2. Run the seeding in production:
   ```bash
   npm run seed:run:prod
   ```

## Security

- The function requires a secure admin token for authorization
- Uses service role key for database operations
- Environment variables are managed separately for local and production environments
- Tickets are only created when new users are added

## Notes

- The seeding process is idempotent - running it multiple times won't create duplicate users
- Tickets are only created when new users are added to prevent duplicates
- All operations are logged for monitoring and debugging
- Make sure to export your environment variables before running the commands (use `export VARIABLE_NAME=value`) 