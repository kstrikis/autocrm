/// <reference types="cypress" />

/**
 * Cypress E2E Test Support File
 * Contains commands for:
 * - User management
 * - Authentication
 * - Test data setup/cleanup
 */

let bufferStack = [[]]; // Stack of buffers, current buffer is always the last one
let currentTestNumber = 0; // Start at 0 so first test is 1
let currentStep = 0;
let isInTest = false; // Track if we're in a test or lifecycle hook

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

/**
 * Formats a step code using the test number (T) and step number (S) as T-SS
 * e.g., test 1 step 5 = 1-05, test 12 step 3 = 12-03
 */
const formatStepCode = (testNum, stepNum, shouldColor) => {
  const code = `${testNum}-${String(stepNum).padStart(2, '0')}`;
  return shouldColor ? `${colors.bright}${colors.cyan}${code}${colors.reset}` : code;
};

/**
 * Formats a log message with colors
 */
const formatLogMessage = (stepCode, message, options = {}) => {
  if (options.isSegment) {
    const segmentName = options.isLifecycle ? message : `${colors.magenta}${message}${colors.reset}`;
    return `${stepCode}: Starting segment: ${segmentName}`;
  }
  
  return `${stepCode}: ${message}`;
};

/**
 * Creates a new buffer for nested operations
 */
Cypress.Commands.add('pushBuffer', () => {
  bufferStack.push([]);
  return undefined;
});

/**
 * Pops the current buffer, optionally flushing it
 */
Cypress.Commands.add('popBuffer', (shouldFlush = true) => {
  if (bufferStack.length <= 1) {
    throw new Error('Cannot pop the root buffer');
  }
  const buffer = bufferStack.pop();
  if (shouldFlush && buffer.length > 0) {
    cy.task('log', { message: buffer.join(' ') });
  }
  return undefined;
});

/**
 * Gets the current active buffer
 */
const getCurrentBuffer = () => {
  return bufferStack[bufferStack.length - 1];
};

/**
 * Directly pushes a message to the current buffer without incrementing step counter
 */
Cypress.Commands.add('pushToLog', (message) => {
  const stepCode = formatStepCode(currentTestNumber, currentStep, isInTest);
  getCurrentBuffer().push(`... ${message}`);
});

/**
 * Flushes the current buffer to console
 */
Cypress.Commands.add('flushLogBuffer', (options = {}) => {
  const buffer = getCurrentBuffer();
  if (buffer.length > 0) {
    cy.task('log', { 
      message: options.withHeader ? 
        '\n=== Test Execution Path ===\n' + buffer.join(' ') :
        buffer.join(' ')
    });
    buffer.length = 0; // Clear current buffer
  }
});

/**
 * Structured logging task that outputs messages immediately with newlines
 * Format: T-SS where T is the test number and SS is the step number
 */
Cypress.Commands.add('logStep', (message, options = {}) => {
  const stepCode = formatStepCode(currentTestNumber, currentStep, isInTest && !options.isLifecycle);
  const formattedMessage = formatLogMessage(stepCode, message, options);
  
  // Print immediately with newline
  cy.task('log', { message: formattedMessage });
  
  if (options.isError) {
    cy.flushLogBuffer({ withHeader: true });
    throw new Error(`Failed at step ${formatStepCode(currentTestNumber, currentStep, false)}: ${message}`);
  }
  
  if (options.complete) {
    cy.flushLogBuffer({ withHeader: true });
  }
  
  currentStep++;
  if (currentStep > 99) {
    currentStep = 0;
  }
});

/**
 * Starts a new test segment, resetting the step counter
 */
Cypress.Commands.add('startSegment', (segmentName) => {
  isInTest = true;
  currentStep = 0;
  cy.logStep(segmentName, { isSegment: true });
});

/**
 * Starts a new lifecycle segment (beforeEach/afterEach), resetting the step counter
 * Increments test number for beforeEach since that's when a new test starts
 */
Cypress.Commands.add('startLifecycleSegment', (segmentName, isBeforeEach = false) => {
  isInTest = false;
  if (isBeforeEach) {
    currentTestNumber++;
  }
  currentStep = 0;
  cy.logStep(segmentName, { isSegment: true, isLifecycle: true });
});

/**
 * Cypress E2E Test Support File
 * Contains commands for:
 * - User Management (create, query, cleanup)
 * - Authentication (sign in, sign out)
 * - Ticket Management (seed, cleanup)
 */

import { supabase, supabaseAdmin } from './supabase.js'

// ===================================
// User Management Commands
// ===================================

/**
 * Creates a new user with admin privileges
 * @param {string} email - User's email
 * @param {Object} options - Optional parameters
 * @param {string} options.fullName - User's full name (defaults to email username)
 * @param {string} options.displayName - User's display name (defaults to fullName)
 * @param {string} options.role - User's role (defaults to 'service-rep')
 * @param {string} options.password - User's password (defaults to 'testpass123')
 * @param {Object} options.metadata - Additional user metadata
 */
Cypress.Commands.add('createAdminManagedUser', (email, options = {}) => {
  cy.pushBuffer();
  cy.pushToLog(`createAdminManagedUser: ${email}`);

  const defaults = {
    fullName: email.split('@')[0],
    role: 'service-rep',
    password: 'testpass123'
  };
  
  const config = {
    ...defaults,
    ...options,
    displayName: options.displayName || options.fullName || defaults.fullName
  };

  return cy.wrap(
    supabaseAdmin.auth.admin.createUser({
      email,
      password: config.password,
      email_confirm: true,
      user_metadata: {
        full_name: config.fullName,
        display_name: config.displayName,
        role: config.role,
        ...config.metadata
      }
    })
  ).then(({ data: { user }, error }) => {
    if (error) {
      cy.pushToLog(`error: ${error.message}`);
      cy.popBuffer();
      throw error; // This will be caught by Cypress's built-in error handling
    }

    cy.pushToLog(`created (id: ${user.id}, role: ${config.role})`);
    cy.popBuffer();
    return cy.wrap(user);
  });
});

/**
 * Creates a new user through the standard signup flow
 * @param {string} email - User's email
 * @param {Object} options - Optional parameters
 * @param {string} options.password - User's password (defaults to 'testpass123')
 * @param {string} options.fullName - User's full name (defaults to email username)
 * @param {string} options.displayName - User's display name (defaults to fullName)
 * @param {string} options.role - User's role (defaults to 'customer')
 * @param {Object} options.metadata - Additional user metadata
 */
Cypress.Commands.add('createTestUser', (email, options = {}) => {
  cy.pushBuffer();
  cy.pushToLog(`createTestUser: ${email}`);

  const defaults = {
    password: 'testpass123',
    fullName: email.split('@')[0],
    role: 'customer'
  };
  
  const config = {
    ...defaults,
    ...options,
    displayName: options.displayName || options.fullName || defaults.fullName
  };

  return cy.wrap(
    supabase.auth.signUp({
      email,
      password: config.password,
      options: {
        data: {
          full_name: config.fullName,
          display_name: config.displayName,
          role: config.role,
          ...config.metadata
        }
      }
    })
  ).then((response) => {
    if (response.error) {
      cy.pushToLog(`error: ${response.error.message}`);
      cy.popBuffer();
      throw response.error; // Cypress will catch this automatically
    }

    const userId = response.data?.user?.id;
    cy.pushToLog(`created (id: ${userId}, role: ${config.role})`);
    cy.popBuffer();
    return response;
  });
});

/**
 * Queries all users from the database
 * Returns combined data from auth and user_profiles tables
 */
Cypress.Commands.add('queryAllUsers', () => {
  cy.pushBuffer();
  cy.pushToLog('queryAllUsers');

  return cy.wrap(
    supabaseAdmin.auth.admin.listUsers()
  ).then(({ data: { users }, error }) => {
    if (error) {
      cy.pushToLog(`error listing users: ${error.message}`);
      cy.popBuffer();
      throw error;
    }

    return cy.wrap(
      supabaseAdmin
        .from('user_profiles')
        .select('*')
    ).then(({ data: profiles, error: profileError }) => {
      if (profileError) {
        cy.pushToLog(`error fetching profiles: ${profileError.message}`);
        cy.popBuffer();
        throw profileError;
      }

      // Combine and format results
      const combinedUsers = users.map(user => ({
        ...user,
        profile: profiles.find(p => p.id === user.id) || {}
      }));

      // Format role counts
      const roleCounts = combinedUsers.reduce((acc, { profile }) => {
        const role = profile.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      cy.pushToLog(
        `found ${combinedUsers.length} users ` +
        `(${Object.entries(roleCounts).map(([r, c]) => `${r}:${c}`).join(', ')})`
      );
      
      cy.popBuffer();
      return combinedUsers;
    });
  });
});

/**
 * Removes a test user and their associated data
 */
Cypress.Commands.add('cleanupTestUser', (email) => {
  cy.pushBuffer();
  cy.pushToLog(`cleanupTestUser: ${email}`);

  return cy.wrap(
    supabaseAdmin.auth.admin.listUsers()
  ).then(({ data: { users }, error: listError }) => {
    if (listError) {
      cy.pushToLog(`error listing users: ${listError.message}`);
      cy.popBuffer();
      throw listError;
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      cy.pushToLog('user not found');
      cy.popBuffer();
      return cy.wrap(null); // Wrap null in cy command
    }

    // Delete user profile
    return cy.wrap(
      supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', user.id)
    ).then((profileDeleteResult) => {
      if (profileDeleteResult.error) {
        cy.pushToLog(`profile deletion failed: ${profileDeleteResult.error.message}`);
        cy.popBuffer();
        throw profileDeleteResult.error;
      }

      // Delete auth user
      return cy.wrap(
        supabaseAdmin.auth.admin.deleteUser(user.id)
      ).then((authDeleteResult) => {
        if (authDeleteResult.error) {
          cy.pushToLog(`auth deletion failed: ${authDeleteResult.error.message}`);
          cy.popBuffer();
          throw authDeleteResult.error;
        }

        cy.pushToLog('successfully deleted user');
        cy.popBuffer();
        return cy.wrap(true); // Wrap boolean return value
      });
    });
  });
});

// ===================================
// Authentication Commands
// ===================================

/**
 * Signs in a user using email/password
 * @param {string} email - User's email
 * @param {Object} options - Optional parameters
 * @param {string} options.password - User's password (defaults to 'testpass123')
 */
Cypress.Commands.add('supabaseSignIn', (email, options = {}) => {
  cy.pushBuffer();
  cy.pushToLog(`supabaseSignIn: ${email}`);

  const config = {
    password: 'testpass123',
    ...options
  };

  return cy.wrap(
    supabase.auth.signInWithPassword({
      email,
      password: config.password
    })
  ).then((response) => {
    if (response.error) {
      cy.pushToLog(`error: ${response.error.message}`);
      cy.popBuffer();
      throw response.error;
    }

    cy.pushToLog(`success (userId: ${response.data?.user?.id})`);
    cy.popBuffer();
    return cy.wrap(response);
  });
});

/**
 * Signs out the current user
 */
Cypress.Commands.add('supabaseSignOut', () => {
  cy.pushBuffer();
  cy.pushToLog('supabaseSignOut');

  return cy.wrap(
    supabase.auth.signOut()
  ).then(({ error }) => {
    if (error) {
      cy.pushToLog(`error: ${error.message}`);
      cy.popBuffer();
      throw error;
    }

    cy.pushToLog('success');
    cy.popBuffer();
  });
});

// ===================================
// Ticket Management Commands
// ===================================

/**
 * Removes all test tickets from the database
 */
Cypress.Commands.add('cleanupTestTickets', () => {
  cy.pushBuffer();
  cy.pushToLog('cleanupTestTickets');

  return cy.wrap(
    supabaseAdmin
      .from('tickets')
      .delete()
      .gte('created_at', '2000-01-01')  // Delete all tickets created after year 2000
  ).then(({ error }) => {
    if (error) {
      cy.pushToLog(`error: ${error.message}`);
      cy.popBuffer();
      throw error;
    }

    cy.pushToLog('all test tickets removed');
    cy.popBuffer();
  });
});

/**
 * Seeds the database with test tickets
 * Validates ticket data before insertion
 */
Cypress.Commands.add('seedTestTickets', (tickets) => {
  cy.pushBuffer();
  cy.pushToLog(`seedTestTickets: ${tickets.length} tickets`);

  return cy.then(() => {
    // Validate all tickets first
    tickets.forEach((ticket, index) => {
      cy.pushToLog(`validating ticket ${index + 1}/${tickets.length}`);

      // Type checking
      if (typeof ticket.customerId !== 'string') {
        const error = `Invalid customerId type: ${typeof ticket.customerId}`;
        cy.pushToLog(`validation failed: ${error}`);
        cy.popBuffer();
        throw new Error(error);
      }

      // Required fields check
      const requiredFields = ['title', 'description', 'customerId', 'status', 'priority'];
      const missing = requiredFields.filter(f => !ticket[f]);
      if (missing.length) {
        const error = `Missing fields: ${missing.join(', ')}`;
        cy.pushToLog(`validation failed: ${error}`);
        cy.popBuffer();
        throw new Error(error);
      }

      // Status validation
      const validStatus = ['new', 'open', 'pending_customer', 'pendingCustomer', 'pending_internal', 'pendingInternal', 'resolved', 'closed'];
      if (!validStatus.includes(ticket.status)) {
        const error = `Invalid status: ${ticket.status}`;
        cy.pushToLog(`validation failed: ${error}`);
        cy.popBuffer();
        throw new Error(error);
      }

      // Priority validation
      const validPriority = ['low', 'medium', 'high', 'urgent'];
      if (!validPriority.includes(ticket.priority)) {
        const error = `Invalid priority: ${ticket.priority}`;
        cy.pushToLog(`validation failed: ${error}`);
        cy.popBuffer();
        throw new Error(error);
      }
    });

    // Process tickets for database
    const processed = tickets.map(ticket => ({
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      customer_id: ticket.customerId,
      assigned_to: ticket.assignedTo,
      tags: ticket.tags || [],
      metadata: ticket.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    cy.pushToLog(`processed ${processed.length} tickets`);

    // Insert into database
    return cy.wrap(
      supabaseAdmin
        .from('tickets')
        .insert(processed)
    ).then(({ error }) => {
      if (error) {
        cy.pushToLog(`insert failed: ${error.message}`);
        cy.popBuffer();
        throw error;
      }
      
      cy.pushToLog(`inserted ${processed.length} tickets`);
      cy.popBuffer();
    });
  });
});