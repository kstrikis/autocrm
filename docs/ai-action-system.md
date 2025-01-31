# AI Action System Architecture

## Overview

The AI Action System is a sophisticated feature that allows service representatives to interact with the CRM using natural language. It interprets their intent, converts it into structured actions, and provides a safety mechanism for reviewing and executing these actions.

## Core Philosophy

1. **Natural Language First**: Service reps should be able to express their intentions in plain English, without needing to learn specific commands or syntax.
2. **Safety Through Review**: All AI-interpreted actions are pending by default, requiring human verification before execution (configurable per user).
3. **Multi-Action Support**: A single natural language input can generate multiple distinct actions, allowing for complex operations to be expressed naturally.
4. **Contextual Understanding**: The system considers recent ticket history and customer information to make informed interpretations.
5. **Fail-Safe Defaults**: When in doubt, the system errs on the side of caution, requiring approval rather than making assumptions.

## System Components

### 1. Process AI Action Function (`/supabase/functions/process-ai-action/`)

This edge function is responsible for:
- Receiving natural language input from service reps
- Gathering contextual information about tickets and customers
- Interpreting the input using GPT-4
- Creating pending action records

Key features:
- Uses LangChain for structured AI interactions
- Maintains detailed logging through LangSmith
- Supports multiple actions per input
- Handles user preferences for auto-approval

### 2. Execute AI Action Function (`/supabase/functions/execute-ai-action/`)

This edge function handles:
- Action approval/rejection
- Actual execution of approved actions
- Status updates and error handling
- Validation of user permissions

Supported action types:
- `assign_ticket`: Updates ticket assignment and optionally status
- `update_status`: Changes ticket status
- `update_tags`: Adds/removes tags
- `add_note`: (Planned) Adds notes to tickets

### 3. AI Actions Dashboard (`/src/components/ai/AIActionsDashboard.tsx`)

The frontend component that:
- Displays pending and historical AI actions
- Shows detailed information via hover cards
- Provides approve/reject controls
- Updates in real-time via Supabase subscriptions

## Data Flow

1. **Input Phase**:
   ```
   User Input -> Process AI Action -> LangChain/GPT-4 -> Action Records
   ```

2. **Review Phase**:
   ```
   AIActionsDashboard -> Display Pending Actions -> User Review
   ```

3. **Execution Phase**:
   ```
   User Approval -> Execute AI Action -> Database Updates -> Real-time Updates
   ```

## Action Types and Their Behavior

### Assign Ticket
- Updates `assigned_to` field
- Optionally updates status to 'open'
- High confidence threshold for assignment actions

### Update Status
- Changes ticket status
- Validates against allowed status values
- Considers workflow implications

### Update Tags
- Supports both adding and removing tags
- Maintains tag uniqueness
- Preserves existing tags not mentioned

### Add Note (Planned)
- Will support both internal and customer-visible notes
- Will integrate with notification system
- Will maintain note history

## Safety Mechanisms

1. **User Validation**:
   - Verifies service rep role
   - Checks user permissions
   - Validates action ownership

2. **Action Validation**:
   - Ensures actions reference valid tickets
   - Validates status values and assignments
   - Prevents duplicate or conflicting actions

3. **Execution Safety**:
   - Atomic updates where possible
   - Error handling and status tracking
   - Audit trail via action records

## Configuration and Customization

### User Preferences
- `requireApproval`: Controls whether actions need manual approval
- Defaults to requiring approval for safety
- Configurable per user in their AI preferences

### Environment Configuration
- Supports development and production environments
- Configurable CORS origins
- Environment-specific logging levels

## Best Practices

1. **Input Formatting**:
   - Be specific about ticket references
   - Use clear action verbs
   - Combine related actions in single inputs

2. **Action Review**:
   - Always verify ticket references
   - Check for unintended side effects
   - Review all actions in multi-action requests

3. **Error Handling**:
   - Monitor action execution status
   - Check error messages for failed actions
   - Retry failed actions when appropriate

## Future Enhancements

1. **Planned Features**:
   - Note management system integration
   - Enhanced confidence scoring
   - Action templates and macros
   - Batch action processing

2. **Potential Improvements**:
   - Machine learning from user corrections
   - Advanced natural language understanding
   - Workflow automation integration
   - Enhanced real-time collaboration

## Troubleshooting

Common issues and solutions:
1. **Action Not Processing**:
   - Check user permissions
   - Verify ticket exists and is accessible
   - Review action format and required fields

2. **Execution Failures**:
   - Check error messages in action record
   - Verify database constraints
   - Ensure required relationships exist

3. **Performance Issues**:
   - Monitor LangChain response times
   - Check Supabase query performance
   - Review subscription efficiency

## Monitoring and Maintenance

The system provides extensive logging:
- AI interpretation results
- Action creation and execution
- Error conditions and failures
- Performance metrics via LangSmith

Regular maintenance tasks:
1. Review and clean up stale pending actions
2. Monitor AI model performance
3. Update allowed values (statuses, tags, etc.)
4. Review and optimize database indices

## Security Considerations

1. **Authentication**:
   - All actions require authenticated users
   - Role-based access control
   - Secure environment variables

2. **Data Protection**:
   - No sensitive data in logs
   - Careful handling of customer information
   - Audit trail of all actions

3. **API Security**:
   - CORS protection
   - Rate limiting
   - Input validation

## Testing Strategy

1. **Unit Tests**:
   - Action interpretation
   - Data transformation
   - Component rendering

2. **Integration Tests**:
   - End-to-end action flow
   - Real-time updates
   - Error scenarios

3. **User Acceptance Testing**:
   - Natural language variations
   - Complex multi-action scenarios
   - Edge cases and error conditions 