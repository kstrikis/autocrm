/// <reference types="cypress" />

/**
 * Cypress E2E Test Support File
 * Contains commands for:
 * - User management
 * - Authentication
 * - Test data setup/cleanup
 */

let logBuffer = [];
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
 * Structured logging task that buffers messages and outputs them in CSV format
 * Format: T-SS where T is the test number and SS is the step number
 */
Cypress.Commands.add('logStep', (message, options = {}) => {
  const stepCode = formatStepCode(currentTestNumber, currentStep, isInTest && !options.isLifecycle);
  logBuffer.push(formatLogMessage(stepCode, message, options));
  
  if (options.isError) {
    // Immediately flush buffer on error
    cy.task('log', { 
      message: '\n=== Test Execution Path ===\n' + logBuffer.join('\n')
    });
    logBuffer = [];
    throw new Error(`Failed at step ${formatStepCode(currentTestNumber, currentStep, false)}: ${message}`);
  }
  
  if (options.complete) {
    // Flush buffer on completion
    cy.task('log', { 
      message: '\n=== Test Execution Path ===\n' + logBuffer.join('\n')
    });
    logBuffer = [];
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
  const defaults = {
    fullName: email.split('@')[0],
    role: 'service-rep',
    password: 'testpass123'
  }
  
  const config = {
    ...defaults,
    ...options,
    displayName: options.displayName || options.fullName || defaults.fullName
  }

  cy.logStep('Creating admin managed user', { message: '🔑 Creating admin managed user', email, role: config.role, fullName: config.fullName })

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
      cy.logStep('Error creating admin managed user', { isError: true, message: '❌ Error creating admin managed user', error })
      throw error
    }
    cy.logStep('Admin managed user created', { message: '✅ Admin managed user created', userId: user.id, email, role: config.role })
    return cy.wrap(user)
  })
})

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
  const defaults = {
    password: 'testpass123',
    fullName: email.split('@')[0],
    role: 'customer'
  }
  
  const config = {
    ...defaults,
    ...options,
    displayName: options.displayName || options.fullName || defaults.fullName
  }

  cy.logStep('Creating test user', { message: '🔑 Creating test user', email, role: config.role, fullName: config.fullName })

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
      cy.logStep('Error creating test user', { isError: true, message: '❌ Error creating test user', error: response.error })
      throw response.error
    }
    cy.logStep('Test user created', { message: '✅ Successfully created test user', userId: response.data?.user?.id, email, metadata: response.data?.user?.user_metadata })
    return response
  })
})

/**
 * Queries all users from the database
 * Returns combined data from auth and user_profiles tables
 */
Cypress.Commands.add('queryAllUsers', () => {
  cy.logStep('Querying all users from database', { message: '🔍 Querying all users from database' })

  return cy.wrap(
    supabaseAdmin.auth.admin.listUsers()
  ).then(({ data: { users }, error }) => {
    if (error) {
      cy.logStep('Error querying users', { isError: true, message: '❌ Error querying users', error })
      throw error
    }

    // Get user profiles for all users
    return cy.wrap(
      supabaseAdmin
        .from('user_profiles')
        .select('*')
    ).then(({ data: profiles, error: profileError }) => {
      if (profileError) {
        cy.logStep('Error querying user profiles', { isError: true, message: '❌ Error querying user profiles', error: profileError })
        throw profileError
      }

      // Combine auth users with their profiles
      const combinedUsers = users.map(user => {
        const profile = profiles.find(p => p.id === user.id) || {}
        return {
          ...user,
          profile
        }
      })

      cy.logStep('Users retrieved', { message: '✅ Successfully retrieved all users', count: combinedUsers.length, roles: combinedUsers.reduce((acc, user) => {
        const role = user.profile.role || 'unknown'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {}) })

      return combinedUsers
    })
  })
})

/**
 * Removes a test user and their associated data
 */
Cypress.Commands.add('cleanupTestUser', (email) => {
  cy.logStep('Starting cleanup of test user', { message: '🧹 Starting cleanup of test user', email })

  return cy.wrap(
    supabaseAdmin.auth.admin.listUsers()
  ).then(({ data: { users }, error: listError }) => {
    if (listError) {
      cy.logStep('Error listing users', { isError: true, message: '❌ Error listing users', error: listError })
      throw listError
    }

    const user = users.find(u => u.email === email)
    if (!user) {
      cy.logStep('User not found during cleanup', { message: '💡 User not found during cleanup', email })
      return
    }

    // Delete the user profile first
    return cy.wrap(
      supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', user.id)
    ).then(() => {
      cy.logStep('User profile deleted', { message: '✅ User profile deleted', email })

      // Then delete the auth user
      return cy.wrap(
        supabaseAdmin.auth.admin.deleteUser(user.id)
      ).then(() => {
        cy.logStep('Auth user deleted', { message: '✅ Auth user deleted', email })
      })
    })

    cy.logStep('User cleanup complete', { message: '✅ User cleanup complete', email, complete: true })
  })
})

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
  const config = {
    password: 'testpass123',
    ...options
  }

  cy.logStep('Signing in user', { message: '🔑 Signing in user', email })

  return cy.wrap(
    supabase.auth.signInWithPassword({
      email,
      password: config.password
    })
  ).then((response) => {
    if (response.error) {
      cy.logStep('Error signing in', { isError: true, message: '❌ Error signing in', error: response.error })
      throw response.error
    }
    cy.logStep('Signed in', { message: '✅ Successfully signed in', userId: response.data?.user?.id, email, metadata: response.data?.user?.user_metadata })
    return cy.wrap(response)
  })
})

/**
 * Signs out the current user
 */
Cypress.Commands.add('supabaseSignOut', () => {
  cy.logStep('Signing out user', { message: '🚪 Signing out user' })

  return cy.wrap(
    supabase.auth.signOut()
  ).then(({ error }) => {
    if (error) {
      cy.logStep('Error signing out', { isError: true, message: '❌ Error signing out', error })
      throw error
    }
    cy.logStep('Signed out', { message: '✅ Sign out successful', complete: true })
  })
})

// ===================================
// Ticket Management Commands
// ===================================

/**
 * Removes all test tickets from the database
 */
Cypress.Commands.add('cleanupTestTickets', () => {
  cy.logStep('Starting cleanup of test tickets', { message: '🧹 Starting cleanup of test tickets' })

  return cy.wrap(
    supabaseAdmin
      .from('tickets')
      .delete()
      .neq('id', 0) // Ensure we don't delete any system tickets
  ).then(() => {
    cy.logStep('Tickets cleanup complete', { message: '✅ Tickets cleanup complete', complete: true })
  })
})

/**
 * Seeds the database with test tickets
 * Validates ticket data before insertion
 */
Cypress.Commands.add('seedTestTickets', (tickets) => {
  cy.logStep('Starting ticket seeding', { message: '🌱 Starting ticket seeding', count: tickets.length })

  // Validate ticket data
  const validateTicket = (ticket) => {
    // Add type checking with logging
    cy.logStep('Validating ticket', { message: '🔍 Validating ticket', title: ticket.title, customerId: ticket.customerId });

    if (typeof ticket.customerId !== 'string') {
      const error = `Invalid customerId type: ${typeof ticket.customerId} (${ticket.customerId})`;
      cy.logStep('Validation Error', { isError: true, message: '❌ Validation Error', error });
      throw new Error(error);
    }

    const requiredFields = ['title', 'description', 'customerId', 'status', 'priority']
    const missingFields = requiredFields.filter(field => !ticket[field])
    if (missingFields.length) {
      const error = `Missing required fields: ${missingFields.join(', ')}`
      cy.logStep('Validation Error', { isError: true, message: '❌ Validation Error', error });
      throw new Error(error)
    }

    // Validate status
    if (!['new', 'open', 'pendingCustomer', 'pendingInternal', 'resolved', 'closed'].includes(ticket.status)) {
      const error = `Invalid status: ${ticket.status}`
      cy.logStep('Validation Error', { isError: true, message: '❌ Validation Error', error });
      throw new Error(error)
    }

    // Validate priority
    if (!['low', 'medium', 'high', 'urgent'].includes(ticket.priority)) {
      const error = `Invalid priority: ${ticket.priority}`
      cy.logStep('Validation Error', { isError: true, message: '❌ Validation Error', error });
      throw new Error(error)
    }
  }

  // Validate all tickets first
  tickets.forEach(validateTicket)

  // Log ticket data for debugging
  cy.logStep('Ticket data', { message: '📝 Ticket data', count: tickets.length, titles: tickets.map(t => t.title) });

  // Convert all tickets to database format
  const processedTickets = tickets.map(ticket => ({
    title: ticket.title,
    description: ticket.description,
    status: ticket.status.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
    priority: ticket.priority,
    customer_id: ticket.customerId,
    assigned_to: ticket.assignedTo,
    tags: ticket.tags || [],
    metadata: ticket.metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  // Log processed tickets
  cy.logStep('Prepared tickets for database', { message: '📝 Prepared tickets for database', count: processedTickets.length });

  // Insert tickets into database
  return cy.wrap(
    supabaseAdmin
      .from('tickets')
      .insert(processedTickets)
  ).then(({ error }) => {
    if (error) {
      cy.logStep('Error seeding tickets', { isError: true, message: '❌ Error seeding tickets', error })
      throw error
    }
    cy.logStep('Tickets seeded', { message: '✅ Successfully seeded tickets', complete: true })
  })
})