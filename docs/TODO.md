Here's the restructured implementation plan based on your requirements and insights:

# AutoCRM Implementation Checklist 

**Implementation Order**:  
1. Layout → 2. Ticketing → 3. User Management → 4. Knowledge Base  
**Atomic Principle**: Each checkbox = 1 dev day (junior capacity)  
**Layer Notation**: [DB] [Edge] [UI]

---

### 1. Core Layout & Navigation
- [ ] **Base Routing Structure** [UI]  
  Implement role-based route guards with empty components  
  - Customer/ServiceRep/Admin layout shells  
  - Auth redirect handling  
  - 404 fallback route

- [ ] **Header System** [UI]  
  Build responsive header with:  
  - Dynamic logo routing per role  
  - Mobile-responsive menu toggle  
  - Notification badge placeholder  
  - User dropdown skeleton

- [ ] **Navigation Drawers** [UI]  
  Implement collapsible sidebars with:  
  - Role-filtered menu items  
  - Active route highlighting  
  - Mobile overlay behavior  
  - Persistent scroll state

---

### 2. Ticketing System Foundation
- [ ] **Tickets Table Migration** [DB]  
  Create `tickets` table with:  
  - Status/priority fields  
  - RLS for customer visibility  
  - Indexes for common queries

- [ ] **Ticket Creation Flow** [Edge][UI]  
  Build with:  
  - Edge function validation (title/description length)  
  - Supabase Storage integration for attachments  
  - Loading states/error feedback

- [ ] **Ticket List Views** [UI]  
  Implement with:  
  - Role-based filtering (customer vs team)  
  - Sortable columns (priority/date)  
  - Status color coding  
  - Pagination controls

- [ ] **Ticket Detail Page** [Edge][UI]  
  Create with:  
  - Realtime subscription to updates  
  - Message thread placeholder  
  - Status change controls  
  - Attachment preview modal

---

### 3. Ticket Conversations
- [ ] **Messages Table Migration** [DB]  
  Create `ticket_messages` with:  
  - RLS for participant visibility  
  - Composite index on (ticket_id, created_at)  
  - Foreign key constraints

- [ ] **Conversation Edge Functions** [Edge]  
  Implement:  
  - Message creation with sender validation  
  - Attachment metadata handling  
  - Internal/external flag enforcement

- [ ] **Message Interface** [UI]  
  Build with:  
  - Differentiated internal/external bubbles  
  - @mention autocomplete  
  - Typing indicators  
  - File upload progress

---

### 4. User Management
- [ ] **User Profiles Migration** [DB]  
  Create `user_profiles` table with:  
  - Role-specific columns (company/team)  
  - RLS for self-service edits  
  - Soft delete pattern

- [ ] **Admin Edge Functions** [Edge]  
  Implement:  
  - Bulk role update validation  
  - Deactivation cascade checks  
  - Audit log entries

- [ ] **User Interface** [UI]  
  Build with:  
  - Role-based visibility columns  
  - Batch action controls  
  - Profile edit modals  
  - Activity timeline

---

### 5. Notifications System
- [ ] **Notifications Table** [DB]  
  Create with:  
  - Expiry TTL index  
  - Unread count materialized view  
  - RLS per user

- [ ] **Notification Edge Functions** [Edge]  
  Implement:  
  - Email template merging  
  - Webhook retry logic  
  - Realtime channel broadcasts

- [ ] **UI Integration** [UI]  
  Add:  
  - Badge counter animations  
  - Mark-as-read API calls  
  - Notification preferences  

---

### 6. Knowledge Base
- [ ] **KB Schema Migration** [DB]  
  Create tables for:  
  - Article versions  
  - Category hierarchy  
  - Search term vectors

- [ ] **Search Edge Functions** [Edge]  
  Implement:  
  - Fuzzy text matching  
  - View counter updates  
  - Related article scoring

- [ ] **Editor Interface** [UI]  
  Build with:  
  - Collaborative editing locks  
  - Version diff slider  
  - Auto-TOC generation  
  - Approval workflows

---

### Critical Path Validation
- [ ] **E2E Test: Ticket Lifecycle**  
  Customer submit → ServiceRep response → Resolution → Survey

- [ ] **Load Test: Ticket List Pagination**  
  Verify <2s response with 10k tickets

- [ ] **Security Audit: RLS Policies**  
  Validate all table access rules

---

### Implementation Notes
1. **Migrations First**: Always create tables with RLS before related features  
2. **Edge Function Pattern**:  
   ```js
   export default async (req) => {
     // 1. JWT validation
     // 2. Input sanitization
     // 3. RLS check via service role
     // 4. Audit logging
   }
   ```
3. **UI Consistency**: Use Supabase UI kit for loading/error states  
4. **Realtime Strategy**: Use Supabase channels with presence tracking

This structure ensures:  
- Frontend can mock edge functions early  
- Database constraints guide UI development  
- Features can be tested in isolation  
- Critical path remains unblocked