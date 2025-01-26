# E2E Testing Logging System Documentation

## Overview

The E2E testing framework implements a sophisticated logging system designed for clear test execution tracking and effective debugging. The system uses a structured approach with test numbers, step numbers, and nested buffers to provide a hierarchical view of test execution.

## Key Files

- `/cypress/support/e2e.js`: Core logging infrastructure
- `/cypress/e2e/admin-user-management.cy.js`: Example implementation

## Logging Commands

### Core Commands

1. `cy.logStep(message, options)`: Log a single test step
   ```javascript
   cy.logStep('Checking page header')
   cy.logStep('Test complete', { complete: true })
   ```

2. `cy.startSegment(name, isLifecycle)`: Start a new logical segment
   ```javascript
   cy.startSegment('Interface Check')
   cy.startLifecycleSegment('Setup', true)
   ```

3. `cy.pushToLog(message)`: Add supplementary information
   ```javascript
   cy.pushToLog('Starting test setup')
   ```

4. `cy.flushLogBuffer()`: Output accumulated logs
   ```javascript
   cy.flushLogBuffer()
   ```

### Buffer Management

- `cy.pushBuffer()`: Create nested logging context
- `cy.popBuffer(shouldFlush)`: Exit nested context
- `getCurrentBuffer()`: Internal helper for buffer access

## Log Format

### Step Code Format
```
T-SS: message
```
Where:
- T: Test number (1-based)
- SS: Step number (zero-padded)
- Example: "1-05" = Test 1, Step 5

### Color Coding
- Cyan: Step codes
- Magenta: Segment names
- Yellow: Lifecycle events
- Bright: Important status changes

## Best Practices

1. **Test Structure**
   ```javascript
   it('should do something', () => {
     cy.startSegment('Meaningful Name')
     cy.logStep('First action')
     // ... test code ...
     cy.logStep('Test complete', { complete: true })
     cy.flushLogBuffer()
   })
   ```

2. **Lifecycle Hooks**
   ```javascript
   beforeEach(() => {
     cy.startLifecycleSegment('Setup', true)
     cy.pushToLog('Starting setup')
     // ... setup code ...
     cy.pushToLog('Setup complete')
     cy.flushLogBuffer()
   })
   ```

3. **Nested Operations**
   ```javascript
   cy.pushBuffer()
   cy.pushToLog('Starting nested operation')
   // ... nested operations ...
   cy.popBuffer(true) // flush=true
   ```

## Example Output

```
1-01: Starting segment: Setup
... Starting test setup
... Waiting for users table
... Test setup complete
1-02: Starting segment: Interface Check
1-03: Checking page header
1-04: Verifying table headers
1-05: Test complete
1-06: Starting segment: Cleanup
1-07: Test cleanup complete
```

## Implementation Details

### Buffer Stack
- Maintains nested contexts for complex operations
- Allows grouping related logs
- Prevents log interleaving in async operations

### Step Tracking
- Automatic step number increment
- Test number tracking across describes
- Lifecycle event marking

## Tips for Effective Debugging

1. Use segments to group related operations
2. Add supplementary info with `pushToLog`
3. Flush buffers at logical boundaries
4. Include relevant data in log messages
5. Use consistent naming for segments

## Common Patterns

### Data Setup
```javascript
cy.logStep('Creating test user', { email: userEmail })
cy.createTestUser(userEmail, options)
cy.logStep('Waiting for creation')
```

### UI Verification
```javascript
cy.logStep('Checking component state')
cy.get(selector).should('be.visible')
cy.pushToLog('Component visible')
```

### Error Handling
```javascript
cy.logStep('Attempting operation')
try {
  // ... operation ...
  cy.pushToLog('Operation succeeded')
} catch (e) {
  cy.pushToLog(`Operation failed: ${e.message}`)
}
```
