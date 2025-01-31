# AI Working Notes

## Latest Changes
- Fixed TypeScript return type in AIActionsDashboard cleanup function
- Removed unused PostgrestError import from AIPreferences
- Simplified and fixed database types in database.types.ts
- Added proper return type and eslint comment for HTTP header in AuthPage
- Fixed linting errors across multiple components
- Identified failing tests in AI functionality that need attention:
  - Service rep and admin access tests failing due to user visibility
  - Admin user management tests failing due to UI interaction issues
  - AI assistant tests failing due to missing login command
  - AI action processing tests failing due to status element not found
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
- Added detailed AI Assistant implementation plan
- Created AI Assistant tasks in TODO.md
- Fixed TypeScript return type in AIInput component
- Added voice transcription improvements plan
- Designed data model for AI actions and preferences
- Planned out Edge Functions architecture
- Added security and performance considerations

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

## AI Assistant Implementation Plan

### Overview
The AI Assistant will help service representatives perform common actions through natural language requests, with configurable automation levels and approval workflows.

### Flow
1. **Input Processing**
   - Service rep inputs request (text/voice)
   - Request sent to process-ai-action Edge Function
   - Input stored with metadata (rep ID, timestamp, input method)

2. **Context Gathering**
   - Edge Function fetches:
     - All users and their roles
     - All tickets and their current states
     - Service rep's automation preferences
     - Available actions and their requirements

3. **Action Determination (LangChain)**
   - LLM analyzes request with context
   - Determines appropriate action(s)
   - Validates permissions and feasibility
   - Generates structured JSON response

4. **Action Storage**
   - Store in `ai_actions` table:
     - Original request
     - Proposed action(s) as JSON
     - Current status
     - Metadata (timestamps, rep ID, etc.)

5. **Action Execution**
   - Triggered by new `ai_actions` record
   - Checks rep's automation preferences
   - If auto-approved: executes immediately
   - If manual: waits for approval
   - Updates action status

6. **History & UI**
   - Real-time updates in AI Actions table
   - Manual approval button if needed
   - Status indicators
   - Execution results

### Available Actions
1. **Ticket Management**
   - Add note to ticket
   - Update ticket status
   - Change ticket priority
   - Assign ticket to rep
   - Transfer ticket between reps
   - Set due date
   - Mark for follow-up

2. **Tag Management**
   - Add tags
   - Remove tags
   - Create new tags
   - Merge similar tags

3. **Customer Interaction**
   - Schedule callback
   - Send email template
   - Set customer preferences
   - Update contact info

4. **Knowledge Base**
   - Link relevant articles
   - Suggest article creation
   - Update article tags
   - Mark article for review

5. **Workflow Automation**
   - Create ticket template
   - Set up automated responses
   - Configure notification rules
   - Create ticket dependencies

### Data Model Updates

```sql
-- Service rep preferences
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  ai_preferences jsonb DEFAULT '{
    "auto_approve_actions": false,
    "allowed_actions": ["add_note", "update_status", "add_tags"],
    "notification_preferences": {
      "on_action_proposed": true,
      "on_action_executed": true,
      "on_action_failed": true
    }
  }'::jsonb;

-- AI Actions table
CREATE TABLE ai_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_rep_id uuid REFERENCES user_profiles(id),
  original_request text NOT NULL,
  input_method text NOT NULL DEFAULT 'text',
  proposed_actions jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  execution_results jsonb,
  created_at timestamptz DEFAULT now(),
  executed_at timestamptz,
  error_message text,
  requires_approval boolean DEFAULT true,
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz
);

-- Action types enum
CREATE TYPE action_type AS ENUM (
  'add_note',
  'update_status',
  'update_priority',
  'assign_ticket',
  'transfer_ticket',
  'set_due_date',
  'add_tags',
  'remove_tags',
  'schedule_callback',
  'send_email',
  'update_customer',
  'link_article',
  'create_template'
);
```

### Edge Functions Needed
1. `process-ai-action`
   - Main entry point
   - Handles input processing
   - Calls LangChain/OpenAI
   - Creates action records

2. `execute-ai-action`
   - Triggered by new actions
   - Handles actual execution
   - Updates status and results
   - Manages approvals

3. Action-specific functions:
   - `add-ticket-note`
   - `update-ticket-status`
   - `assign-ticket`
   - etc.

### Next Steps
1. [ ] Create database migrations for new schema
2. [ ] Implement basic action processing
3. [ ] Set up LangChain with proper prompts
4. [ ] Create execution framework
5. [ ] Build approval UI
6. [ ] Add real-time updates
7. [ ] Implement voice improvements
8. [ ] Add automated testing

### Security Considerations
- Strict validation of proposed actions
- Role-based access control
- Audit logging
- Rate limiting
- Error handling
- Sensitive data protection

### Performance Optimization
- Caching of context data
- Batch processing where possible
- Efficient database queries
- Real-time update batching
- Background job processing

## 2024-01-31

### Major Changes
1. Fixed AI action system to properly handle approval flow:
   - Removed immediate execution of assignment actions
   - All actions now require approval by default (configurable)
   - Created new execute-ai-action edge function for handling approvals

2. Enhanced AIActionsDashboard UI:
   - Added hover cards for detailed ticket info
   - Added tooltips for action buttons
   - Improved layout with better column organization
   - Added human-readable action descriptions
   - Made input text more compact

3. Added comprehensive documentation:
   - Created ai-action-system.md with full system architecture
   - Documented multi-action support
   - Added safety mechanisms and best practices

4. Added shadcn/ui components:
   - Hover card for detailed information
   - Tooltip for button descriptions

### Technical Details
- Fixed foreign key relationships in Supabase queries
- Added proper type handling for ticket and user data
- Improved error handling and logging
- Added support for multiple actions from single input

### Next Steps
1. Implement notes table and note actions
2. Add tests for execute-ai-action function
3. Consider adding action templates
4. Monitor performance and user feedback

### Questions/Concerns
- Need to verify RLS policies for new execute function
- Consider adding batch approval option
- Monitor AI interpretation accuracy

## 2024-02-06 - Edge Function Deployment and Database Reset Fix

1. Successfully deployed `seed-test-data` Edge Function to project `ndxjncxvuqdsdhoakvrb`
2. Fixed database reset permission errors:
   - Updated Supabase CLI from v2.6.8 to v2.9.6
   - This resolved the "must be owner of publication" errors during database resets
   - The newer version handles publication permissions correctly

### 2024-03-21
- Added clickable ticket title links in AIActionsDashboard component
- Ticket titles now navigate to their respective ticket detail pages using React Router
- Enhanced user experience by making ticket titles interactive while preserving hover card functionality
- Used proper styling to indicate clickable nature of ticket titles with hover states
