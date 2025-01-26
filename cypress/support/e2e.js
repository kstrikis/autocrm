/// <reference types="cypress" />

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

  cy.task('log', { 
    message: '🔑 Creating admin managed user', 
    email,
    role: config.role,
    fullName: config.fullName
  })

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
      cy.task('log', { message: '❌ Error creating admin managed user', error })
      throw error
    }
    cy.task('log', { message: '✅ Admin managed user created', userId: user.id, email, role: config.role })
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

  cy.task('log', { 
    message: '🔑 Creating test user', 
    email,
    role: config.role,
    fullName: config.fullName
  })

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
      cy.task('log', { message: '❌ Error creating test user', error: response.error })
      throw response.error
    }
    cy.task('log', { 
      message: '✅ Successfully created test user', 
      userId: response.data?.user?.id,
      email,
      metadata: response.data?.user?.user_metadata
    })
    return response
  })
})

/**
 * Queries all users from the database
 * Returns combined data from auth and user_profiles tables
 */
Cypress.Commands.add('queryAllUsers', () => {
  cy.task('log', { message: '🔍 Querying all users from database' })
  
  return cy.wrap(
    supabaseAdmin.auth.admin.listUsers()
  ).then(({ data: { users }, error }) => {
    if (error) {
      cy.task('log', { message: '❌ Error querying users', error })
      throw error
    }

    // Get user profiles for all users
    return cy.wrap(
      supabaseAdmin
        .from('user_profiles')
        .select('*')
    ).then(({ data: profiles, error: profileError }) => {
      if (profileError) {
        cy.task('log', { message: '❌ Error querying user profiles', error: profileError })
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

      cy.task('log', { 
        message: '✅ Successfully retrieved all users', 
        count: combinedUsers.length,
        roles: combinedUsers.reduce((acc, user) => {
          const role = user.profile.role || 'unknown'
          acc[role] = (acc[role] || 0) + 1
          return acc
        }, {})
      })

      return combinedUsers
    })
  })
})

/**
 * Removes a test user and their associated data
 */
Cypress.Commands.add('cleanupTestUser', (email) => {
  cy.task('log', { message: '🧹 Starting cleanup of test user', email })
  
  return cy.wrap(
    supabaseAdmin.auth.admin.listUsers()
  ).then(({ data: { users }, error: listError }) => {
    if (listError) {
      cy.task('log', { message: '❌ Error listing users', error: listError })
      throw listError
    }

    const user = users.find(u => u.email === email)
    if (!user) {
      cy.task('log', { message: '💡 User not found during cleanup', email })
      return
    }

    // Delete the user profile first
    return cy.wrap(
      supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', user.id)
    ).then(() => {
      cy.task('log', { message: '✅ User profile deleted', email })

      // Then delete the auth user
      return cy.wrap(
        supabaseAdmin.auth.admin.deleteUser(user.id)
      ).then(() => {
        cy.task('log', { message: '✅ Auth user deleted', email })
      })
    })

    cy.task('log', { message: '✅ User cleanup complete', email })
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

  cy.task('log', { message: '🔑 Signing in user', email })
  return cy.wrap(
    supabase.auth.signInWithPassword({
      email,
      password: config.password
    })
  ).then((response) => {
    if (response.error) {
      cy.task('log', { message: '❌ Error signing in', error: response.error })
      throw response.error
    }
    cy.task('log', { 
      message: '✅ Successfully signed in', 
      userId: response.data?.user?.id,
      email,
      metadata: response.data?.user?.user_metadata
    })
    return cy.wrap(response)
  })
})

/**
 * Signs out the current user
 */
Cypress.Commands.add('supabaseSignOut', () => {
  cy.task('log', { message: '🚪 Signing out user' })
  return cy.wrap(
    supabase.auth.signOut()
  ).then(({ error }) => {
    if (error) {
      cy.task('log', { message: '❌ Error signing out', error })
      throw error
    }
    cy.task('log', { message: '✅ Sign out successful' })
  })
})

// ===================================
// Ticket Management Commands
// ===================================

/**
 * Removes all test tickets from the database
 */
Cypress.Commands.add('cleanupTestTickets', () => {
  cy.task('log', { message: '🧹 Starting cleanup of test tickets' })
  return cy.wrap(
    supabaseAdmin
      .from('tickets')
      .delete()
      .neq('id', 0) // Ensure we don't delete any system tickets
  ).then(() => {
    cy.task('log', { message: '✅ Tickets cleanup complete' })
  })
})

/**
 * Seeds the database with test tickets
 * Validates ticket data before insertion
 */
Cypress.Commands.add('seedTestTickets', (tickets) => {
  cy.task('log', { message: '🌱 Starting ticket seeding', count: tickets.length })
  
  // Validate ticket data
  const validateTicket = (ticket) => {
    // Add type checking with logging
    cy.task('log', { 
      message: '🔍 Validating ticket',
      title: ticket.title,
      customerId: ticket.customerId
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
  cy.task('log', { message: '📝 Ticket data', count: tickets.length, titles: tickets.map(t => t.title) });

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
  cy.task('log', { message: '📝 Prepared tickets for database', count: processedTickets.length });

  // Insert tickets into database
  return cy.wrap(
    supabaseAdmin
      .from('tickets')
      .insert(processedTickets)
  ).then(({ error }) => {
    if (error) {
      cy.task('log', { message: '❌ Error seeding tickets', error })
      throw error
    }
    cy.task('log', { message: '✅ Successfully seeded tickets' })
  })
})