/// <reference types="cypress" />
import { createClient } from '@supabase/supabase-js'

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
  
  // First get the user ID from auth
  cy.wrap(supabaseAdmin.auth.admin.listUsers())
    .then(({ data: { users }, error: listError }) => {
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
      cy.wrap(supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', user.id))

      cy.task('log', { message: '✅ User profile deleted', email })

      // Then delete the auth user
      cy.wrap(supabaseAdmin.auth.admin.deleteUser(user.id))
      cy.task('log', { message: '✅ Auth user deleted', email })
    })

  cy.task('log', { message: '✅ User cleanup complete', email })
})

// Command to create an admin managed user
Cypress.Commands.add('createAdminManagedUser', (email, fullName, role) => {
  cy.task('log', { message: '🔑 Creating admin managed user', email, role })
  cy.wrap(supabaseAdmin.auth.admin.createUser({
    email,
    password: 'testpass123',
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      display_name: fullName,
      role
    }
  }))
  .then(({ data: { user }, error }) => {
    if (error) {
      cy.task('log', { message: '❌ Error creating admin managed user', error })
      throw error
    }
    cy.task('log', { message: '✅ Admin managed user created', userId: user.id, email, role })
    return user
  })
})

// Command to sign in via Supabase
Cypress.Commands.add('supabaseSignIn', (email, password) => {
  cy.task('log', { message: '🔑 Signing in user', email })
  cy.wrap(supabase.auth.signInWithPassword({ email, password }))
    .then(({ error }) => {
      if (error) {
        cy.task('log', { message: '❌ Error signing in', error })
        throw error
      }
      cy.task('log', { message: '✅ Sign in successful' })
    })
})

// Command to sign out via Supabase
Cypress.Commands.add('supabaseSignOut', () => {
  cy.task('log', { message: '🚪 Signing out user' })
  cy.wrap(supabase.auth.signOut())
    .then(({ error }) => {
      if (error) {
        cy.task('log', { message: '❌ Error signing out', error })
        throw error
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
      .delete()
      .neq('id', 0) // Ensure we don't delete any system tickets
  )
  cy.task('log', { message: '✅ Tickets cleanup complete' })
})

// Command to seed test tickets
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
    )
    cy.task('log', { message: '✅ Successfully created tickets', count: processedTickets.length })
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
      testUsers.forEach(user => 
        cy.wrap(supabaseAdmin.auth.admin.deleteUser(user.id))
      )
      cy.task('log', { message: '✅ Successfully cleaned up test users', count: testUsers.length })
    }
  })
})

// Command to login as admin
Cypress.Commands.add('loginAsAdmin', (email, password) => {
  cy.task('log', { message: '🔑 Logging in as admin', email })
  cy.visit('/')
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
  cy.get('button').contains('Sign In').click()
  cy.url().should('include', '/dashboard')
  cy.contains('Welcome').should('be.visible')
  cy.task('log', { message: '✅ Admin login complete' })
})