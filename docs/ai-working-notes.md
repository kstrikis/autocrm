# AI Working Notes

## Latest Changes
- Added Supabase Edge Runtime type definitions to test-ai-action Edge Function
- Fixed CORS headers and error handling in test-ai-action Edge Function
- Improved tracing setup with LangChain and LangSmith
- All tests passing except for 009-ai-assistant.cy.js (needs login command fix)
- Added proper logging and error handling in Edge Function
- Enhanced TypeScript types and error handling across components
- Improved real-time subscription handling in AIActionsDashboard and TicketList
- Added test AI functionality in ServiceRepDashboard
- Updated audio processing in AIInput with better error handling
- Added proper CORS headers and error handling in process-ai-action Edge Function
- Improved toast notifications with better structure and feedback
- Added concurrent function serving capability
- Updated dependencies to latest versions

## Dependencies
- OpenAI API
- Supabase
- LangChain (temporarily removed)
- React components from shadcn/ui

## Environment Setup
Required environment variables:
- OPENAI_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY

## Testing Notes
- Run tests with `npm run test:ai`
- Ensure Edge Functions server is running
- Check Cypress screenshots for failures

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

# AI Assistant Implementation Notes

## Current Structure

### Components
- Edge Function (`process-ai-action`)
  - Handles AI processing using OpenAI/LangChain
  - CORS enabled for local development
  - Validates service rep permissions
  - Creates AI action records

- Frontend Components
  - Test input in ServiceRepDashboard
  - Toast notifications for feedback
  - Data-test attributes for testing

### Data Model
- `ai_actions` table
  - Stores processed actions
  - Links to tickets and users
  - Tracks approval status

### Testing
- End-to-end test suite (010-test-ai-function.cy.js)
- Creates test users and tickets
- Verifies basic functionality

## Current Issues

### Edge Function
- Import errors with LangChain dependencies
- Need to simplify for initial testing
- Memory issues (exit 137)

### Testing
- Cypress command issues (createUser vs createAdminManagedUser)
- Need to ensure proper test data cleanup
- Better error handling needed

## Next Steps

1. Simplify Edge Function
   - Remove LangChain temporarily
   - Use direct OpenAI calls
   - Implement basic logging

2. Fix Test Infrastructure
   - Update Cypress commands
   - Improve error handling
   - Add more detailed logging

3. Improve Error Handling
   - Better error messages
   - Proper cleanup in tests
   - Graceful failure handling

4. Documentation
   - Document test setup process
   - Add API documentation
   - Include example usage

## Dependencies
- OpenAI API
- Supabase
- LangChain (temporarily removed)
- React components from shadcn/ui

## Environment Setup
Required environment variables:
- OPENAI_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY

## Testing Notes
- Run tests with `npm run test:ai`
- Ensure Edge Functions server is running
- Check Cypress screenshots for failures

## Voice Transcription Improvements
- Consider adding a "pronunciation guide" field to user profiles
- This would help Whisper STT better recognize names that are commonly misheard (e.g., "Eva" being heard as "Ava")
- Could be used in both the STT prompt and displayed in the UI when needed
- Example implementation:
  ```typescript
  // In user_profiles table
  pronunciation_guide?: string  // Optional field for phonetic hints
  
  // Example data
  {
    full_name: "Eva Admin",
    pronunciation_guide: "Ee-vah"
  }
  ```
