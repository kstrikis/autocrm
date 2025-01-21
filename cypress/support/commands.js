/// <reference types="cypress" />

import { createClient } from '@supabase/supabase-js'
import { logger } from '../../src/lib/node-logger.ts'

// Initialize Supabase client for testing with service role key
const supabase = createClient(
  Cypress.env('SUPABASE_URL') || 'http://127.0.0.1:54321',
  Cypress.env('SUPABASE_SERVICE_ROLE_KEY') || 'no-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Command to clean up test users
Cypress.Commands.add('cleanupTestUser', (email) => {
  logger.methodEntry('cleanupTestUser', { email })
  return cy.wrap(
    supabase.auth.admin.deleteUser(email)
      .catch((err) => {
        // Ignore if user doesn't exist
        if (!err.message.includes('User not found')) {
          logger.error('Error cleaning up test user', { error: err })
          throw err
        }
        logger.debug('User not found during cleanup', { email })
      })
  ).then(() => {
    logger.methodExit('cleanupTestUser')
  })
})

// Command to create a test user
Cypress.Commands.add('createTestUser', (email, password, metadata = {}) => {
  logger.methodEntry('createTestUser', { email, metadata })
  return cy.wrap(
    supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...metadata,
        role: metadata.role || 'customer'
      }
    })
  ).then((response) => {
    if (response.error) {
      logger.error('Error creating test user', { error: response.error })
      throw response.error
    }
    logger.methodExit('createTestUser', { userId: response.data?.user?.id })
    return response
  })
})

// Command to sign in via Supabase
Cypress.Commands.add('supabaseSignIn', (email, password) => {
  logger.methodEntry('supabaseSignIn', { email })
  return cy.wrap(
    supabase.auth.signInWithPassword({
      email,
      password
    })
  ).then((response) => {
    if (response.error) {
      logger.error('Error signing in', { error: response.error })
      throw response.error
    }
    logger.methodExit('supabaseSignIn', { userId: response.data?.user?.id })
    return response
  })
})

// Command to sign out via Supabase
Cypress.Commands.add('supabaseSignOut', () => {
  logger.methodEntry('supabaseSignOut')
  return cy.wrap(
    supabase.auth.signOut()
  ).then((response) => {
    if (response.error) {
      logger.error('Error signing out', { error: response.error })
      throw response.error
    }
    logger.methodExit('supabaseSignOut')
    return response
  })
})

// Add any custom commands here
// For example:
// Cypress.Commands.add('login', (email, password) => { ... }) 