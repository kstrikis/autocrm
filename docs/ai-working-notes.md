# AI Working Notes

## Latest Changes

### AI Assistant Feature Implementation
- Added AI assistant for service representatives
- Implemented natural language processing for ticket updates
- Added voice input support with OpenAI Whisper
- Created AI actions dashboard for oversight
- Added user preferences for AI features

### Database Changes
- Created ai_actions table with RLS policies
- Added AI preferences to user_profiles
- Added status update function for AI actions

### Component Updates
- Added AIInput component with voice support
- Added AIActionsDashboard for action management
- Updated ServiceRepDashboard with AI tabs
- Added real-time updates for AI actions

### Test Results
- Auth tests: 6/6 passing
- Customer access: 1/1 passing
- Service rep access: 1/1 passing
- Admin access: 1/1 passing
- Admin user management: 4/4 passing
- Ticket creation: 3/3 passing
- Ticket details: 3/3 passing
- Ticket conversations: 1/1 passing
- AI assistant: 4/4 passing

### Next Steps
- Add more sophisticated AI action interpretation
- Implement undo/redo for AI actions
- Add bulk action approval
- Add AI action analytics
- Consider adding AI-powered ticket categorization

## Previous Notes

## Core System Patterns

### Data Model
- **User Profiles**: 
  - Roles: customer/service_rep/admin (Postgres enum)
  - Extends auth.users with profile data
  - RLS policies enforce role-based access
  - AI preferences for service reps
- **Tickets**:
  - Statuses: new/open/pending*/resolved/closed
  - Priorities: low/medium/high/urgent
  - Realtime updates via Postgres publications
  - AI-assisted updates
- **AI Actions**:
  - Types: add_note/update_status/update_tags
  - Statuses: pending/approved/rejected/executed/failed
  - RLS for service rep access
  - Real-time updates via Postgres publications

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
  - `/ai-actions` - AI action management
- **Component Patterns**:
  - Container components handle data fetching
  - Presentational components use shadcn/ui
  - Custom hooks for Supabase subscriptions
  - Real-time AI action updates

### Testing Strategy
- **Cypress**:
  - Custom logging commands
  - Test numbering system
  - Session reuse
  - AI feature testing
- **Key Tests**:
  - Auth flow
  - Role-based access
  - Ticket lifecycle
  - AI action workflow
  - Voice input handling

## Technical Standards

### Code Quality
- **TypeScript**:
  - Strict null checks
  - GraphQL type generation
  - Supabase response typing
  - AI action type safety
- **Logging**:
  - Mandatory method entry/exit logs
  - AI action tracking
  - Error handling
  - Voice input debugging

### Security
- **Backend**:
  - RLS for all tables
  - Service role keys in Edge Functions
  - Admin operations require JWT
  - AI API keys in environment
- **Frontend**:
  - No sensitive key storage
  - Input sanitization
  - Auto-complete hardening
  - Voice permission handling

### Realtime System
- Postgres publications for tickets/users/actions
- Supabase channel subscriptions
- Optimistic UI updates
- Subscription cleanup

## Deployment Setup

### Supabase Config
- Migrations sequence:
  1. Core tables
  2. AI tables
  3. Realtime enablement
  4. Security hardening
- Edge Functions:
  - Deno runtime
  - CORS configuration
  - Environment separation
  - AI service integration

### CI/CD Pipeline
- Test stages:
  1. Lint
  2. Build
  3. E2E
  4. AI Integration
- Seed scripts:
  - Demo data creation
  - AI action examples
  - Test user setup

## Pending Tasks

### High Priority
- [ ] Complete ticket lifecycle E2E test
- [ ] Implement batch role updates
- [ ] Add audit logging to edge functions
- [ ] Add AI action analytics

### Technical Debt
- Bundle size optimization
- Subscription memory leaks
- Flaky admin tests
- AI action performance monitoring

## Key Decisions
1. Use Postgres enums for better typing
2. Implement soft deletes via status
3. Centralized error handling
4. Client-side cache invalidation
5. AI processing in Edge Functions
6. Default to internal notes for safety
7. Require approval by default
