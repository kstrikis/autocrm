/// <reference types="cypress" />

import { createClient } from '@supabase/supabase-js'
import { logger } from '../../src/lib/node-logger.ts'

// Initialize Supabase admin client for admin operations
const supabaseAdmin = createClient(
  Cypress.env('SUPABASE_URL') || 'http://127.0.0.1:54321',
  Cypress.env('SUPABASE_SERVICE_ROLE_KEY') || 'no-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: 'none',
      storage: null
    }
  }
)

// Initialize regular Supabase client for user operations
const supabase = createClient(
  Cypress.env('SUPABASE_URL') || 'http://127.0.0.1:54321',
  Cypress.env('SUPABASE_ANON_KEY') || 'no-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
)

// Command to clean up test user
Cypress.Commands.add('cleanupTestUser', (email) => {
  cy.task('log', { message: '🧹 Starting cleanup of test user', email })
  cy.wrap(
    supabaseAdmin.auth.admin.deleteUser(email)
      .catch((err) => {
        // Ignore if user doesn't exist
        if (!err.message.includes('User not found')) {
          cy.task('log', { message: '❌ Error cleaning up user', error: err })
          throw err
        }
        cy.task('log', { message: '💡 User not found during cleanup', email })
      })
  ).then(() => {
    cy.task('log', { message: '✅ User cleanup complete', email })
  })
})

// Command to create a test user
Cypress.Commands.add('createTestUser', (email, password, metadata = {}) => {
  cy.task('log', { message: '👤 Creating test user', email, metadata });

  // First check for existing user
  cy.wrap(supabaseAdmin.auth.admin.listUsers())
    .then(({ data: { users }, error: listError }) => {
      if (listError) {
        cy.task('log', { message: '❌ Error listing users', error: listError });
        throw listError;
      }

      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        cy.task('log', { message: '💡 Found existing user, deleting first', userId: existingUser.id });
        return supabaseAdmin.auth.admin.deleteUser(existingUser.id)
          .then(() => {
            cy.task('log', { message: '✅ Successfully deleted existing user', email });
          });
      }
    })
    .then(() => {
      return supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          ...metadata,
          full_name: metadata.full_name || 'Test User',
          display_name: metadata.display_name || 'Test',
          role: metadata.role || 'customer'
        }
      });
    })
    .then((response) => {
      if (response.error) {
        cy.task('log', { message: '❌ Error creating test user', error: response.error });
        throw response.error;
      }
      const userId = response.data?.user?.id;
      cy.task('log', { message: '✅ Test user created successfully', userId });
      return userId;
    })
    .then(userId => {
      cy.task('log', { message: '🆔 Returning user ID', userId, type: typeof userId });
      return userId;
    });
});

// Command to sign in via Supabase
Cypress.Commands.add('supabaseSignIn', (email, password) => {
  cy.task('log', { message: '🔑 Signing in user', email })
  cy.wrap(
    supabase.auth.signInWithPassword({
      email,
      password
    })
  ).then((response) => {
    if (response.error) {
      cy.task('log', { message: '❌ Error signing in', error: response.error })
      throw response.error
    }
    cy.task('log', { message: '✅ Sign in successful', userId: response.data?.user?.id })
  })
})

// Command to sign out via Supabase
Cypress.Commands.add('supabaseSignOut', () => {
  cy.task('log', { message: '🚪 Signing out user' })
  cy.wrap(
    supabase.auth.signOut()
  ).then((response) => {
    if (response.error) {
      cy.task('log', { message: '❌ Error signing out', error: response.error })
      throw response.error
    }
    cy.task('log', { message: '✅ Sign out successful' })
  })
})

// Command to clean up test tickets
Cypress.Commands.add('cleanupTestTickets', () => {
  cy.task('log', { message: '🧹 Starting cleanup of test tickets' })
  cy.wrap(
    supabaseAdmin
      .from('tickets')
      .select('id')
  ).then((response) => {
    if (response.error) {
      cy.task('log', { message: '❌ Error fetching tickets for cleanup', error: response.error })
      throw response.error
    }

    if (!response.data?.length) {
      cy.task('log', { message: '💡 No tickets to clean up' })
    } else {
      const ticketIds = response.data.map(t => t.id)
      cy.task('log', { message: '🎫 Found tickets to clean up', count: ticketIds.length })

      cy.wrap(
        supabaseAdmin
          .from('tickets')
          .delete()
          .in('id', ticketIds)
      ).then((deleteResponse) => {
        if (deleteResponse.error) {
          cy.task('log', { message: '❌ Error deleting tickets', error: deleteResponse.error })
          throw deleteResponse.error
        }
        cy.task('log', { message: '✅ Successfully cleaned up tickets', count: deleteResponse.data?.length || 0 })
      })
    }
  })
})

// Command to seed test tickets
Cypress.Commands.add('seedTestTickets', (tickets) => {
  cy.task('log', { message: '🌱 Starting ticket seeding', count: tickets.length })
  
  // Validate ticket data
  const validateTicket = (ticket) => {
    // Add type checking with logging
    cy.task('log', { 
      message: '🔍 Validating ticket',
      ticket: {
        ...ticket,
        customerIdType: typeof ticket.customerId,
        customerIdValue: ticket.customerId
      }
    });
    
    if (typeof ticket.customerId !== 'string') {
      const error = `Invalid customerId type: ${typeof ticket.customerId} (${ticket.customerId})`;
      cy.task('log', { message: '❌ Validation Error', error });
      throw new Error(error);
    }

    const requiredFields = ['title', 'description', 'customerId', 'status', 'priority']
    const missingFields = requiredFields.filter(field => !ticket[field])
    if (missingFields.length) {
      const error = `Missing required fields: ${missingFields.join(', ')}`
      cy.task('log', { message: '❌ Validation Error', error })
      throw new Error(error)
    }

    // Validate status
    if (!['new', 'open', 'pendingCustomer', 'pendingInternal', 'resolved', 'closed'].includes(ticket.status)) {
      const error = `Invalid status: ${ticket.status}`
      cy.task('log', { message: '❌ Validation Error', error })
      throw new Error(error)
    }

    // Validate priority
    if (!['low', 'medium', 'high', 'urgent'].includes(ticket.priority)) {
      const error = `Invalid priority: ${ticket.priority}`
      cy.task('log', { message: '❌ Validation Error', error })
      throw new Error(error)
    }
  }

  // Validate all tickets first
  tickets.forEach(validateTicket)

  // Log ticket data for debugging
  cy.task('log', { message: '📝 Ticket data', tickets })

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
  processedTickets.forEach(ticket => {
    cy.task('log', { message: '📝 Prepared ticket for database', ticket })
  })

  // Verify all customers exist
  const customerIds = processedTickets.map(t => t.customer_id)
  
  cy.wrap(
    supabaseAdmin
      .from('user_profiles')
      .select('id')
      .in('id', customerIds)
  ).then(({ data: customers, error: customerError }) => {
    if (customerError) {
      cy.task('log', { message: '❌ Database Error', error: customerError })
      throw customerError
    }

    const foundCustomerIds = customers.map(c => c.id)
    const missingCustomers = customerIds.filter(id => !foundCustomerIds.includes(id))

    if (missingCustomers.length > 0) {
      const error = `Customers not found: ${missingCustomers.join(', ')}`
      cy.task('log', { message: '❌ Database Error', error })
      throw new Error(error)
    }

    // Insert all tickets
    cy.task('log', { message: '📤 Inserting tickets', count: processedTickets.length })
    
    cy.wrap(
      supabaseAdmin
        .from('tickets')
        .insert(processedTickets)
        .select()
    ).then(({ data, error }) => {
      if (error) {
        cy.task('log', { message: '❌ Database Error', error })
        throw error
      }
      cy.task('log', { message: '✅ Successfully created tickets', count: data.length })
    })
  })
})

// Command to clean up multiple test users
Cypress.Commands.add('cleanupTestUsers', () => {
  cy.task('log', { message: '🧹 Starting cleanup of test users' })
  cy.wrap(
    supabaseAdmin.auth.admin.listUsers()
  ).then(({ data: { users }, error }) => {
    if (error) {
      cy.task('log', { message: '❌ Error listing users', error })
      throw error
    }

    // Filter test users but exclude demo users
    const demoEmails = [
      'customer1@example.com',
      'service1@example.com',
      'admin@example.com'
    ]

    const testUsers = users.filter(user => 
      (user.email?.includes('@example.com') || user.user_metadata?.role === 'test') &&
      !demoEmails.includes(user.email)
    )

    if (!testUsers.length) {
      cy.task('log', { message: '💡 No test users to clean up' })
    } else {
      cy.task('log', { message: '👥 Found test users to clean up', count: testUsers.length })

      // Delete each test user
      const deletePromises = testUsers.map(user => 
        supabaseAdmin.auth.admin.deleteUser(user.id)
      )

      cy.wrap(
        Promise.all(deletePromises)
      ).then(() => {
        cy.task('log', { message: '✅ Successfully cleaned up test users', count: testUsers.length })
      })
    }
  })
})

// Add any custom commands here
// For example:
// Cypress.Commands.add('login', (email, password) => { ... }) 