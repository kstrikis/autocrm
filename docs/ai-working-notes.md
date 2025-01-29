# AI Working Notes

## Latest Changes (2024-01-29)

- Fixed CORS issues with Edge Functions by deploying the `message-create` function with proper CORS headers
- Updated MessageInterface to properly handle authorization when sending messages
- Fixed internal notes visibility - now only service reps can see internal notes
- Updated types to match the Supabase database schema
- Improved error handling and logging in message submission

## Previous Changes

## Core System Patterns

### Data Model
- **User Profiles**: 
  - Roles: customer/service_rep/admin (Postgres enum)
  - Extends auth.users with profile data
  - RLS policies enforce role-based access
- **Tickets**:
  - Statuses: new/open/pending*/resolved/closed
  - Priorities: low/medium/high/urgent
  - Realtime updates via Postgres publications
- **Relationships**:
  - Tickets have customer_id (owner) and assigned_to (service rep)
  - Cascade deletes with foreign keys

### Auth Flow
- Supabase JWT with custom claims for roles
- Edge Functions for admin operations:
  - `seed-users`: Bootstrap demo data
  - `update-user-role`: Admin role management
- Session handling:
  - Client-side auth state with React Context
  - Protected routes validate roles against JWT claims

### Frontend Architecture
- **Routing**:
  - `/auth` - Public auth forms
  - `/dashboard` - Role-based layouts
  - `/tickets` - Ticket management views
- **Component Patterns**:
  - Container components handle data fetching
  - Presentational components use shadcn/ui
  - Custom hooks for Supabase subscriptions

### Testing Strategy
- **Cypress**:
  - Custom logging commands (logStep/pushToLog)
  - Test numbering system for traceability
  - Session reuse between tests
- **Key Tests**:
  - Auth flow permutations
  - Role-based access control
  - Ticket lifecycle transitions
  - Realtime update verification

## Technical Standards

### Code Quality
- **TypeScript**:
  - Strict null checks
  - GraphQL type generation
  - Supabase response typing
- **Logging**:
  - Mandatory method entry/exit logs
  - Sensitive data scrubbing
  - Centralized logger configuration

### Security
- **Backend**:
  - RLS for all Postgres tables
  - Service role keys only in Edge Functions
  - Admin operations require JWT validation
- **Frontend**:
  - Never store sensitive keys
  - Input sanitization in forms
  - Auto-complete hardening

### Realtime System
- Postgres publication for tickets/users
- Supabase channel subscriptions
- Optimistic UI updates
- Subscription cleanup on unmount

## Deployment Setup

### Supabase Config
- Migrations sequence:
  1. Core tables (users → tickets)
  2. Realtime enablement
  3. Security hardening
- Edge Functions:
  - Deno runtime
  - CORS configuration
  - Environment separation (local/prod)

### CI/CD Pipeline
- Test stages:
  1. Lint (ESLint)
  2. Build (Vite)
  3. E2E (Cypress headless)
- Seed scripts:
  - Idempotent data creation
  - Environment-aware (demo vs prod)

## Pending Tasks

### High Priority
- [ ] Complete ticket lifecycle E2E test
- [ ] Implement batch role updates
- [ ] Add audit logging to edge functions

### Technical Debt
- Bundle size optimization (Vite analysis)
- Subscription memory leaks
- Flaky admin checkbox tests

## Key Decisions
1. Use Postgres enums over check constraints for better GraphQL typing
2. Implement soft deletes via status fields instead of data removal
3. Centralized error handling in Edge Functions with CORS safety
4. Client-side cache invalidation strategy using Supabase realtime
