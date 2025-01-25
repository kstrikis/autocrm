/// <reference types="cypress" />
import './commands.js'
import { supabase, supabaseAdmin } from './supabase.js'

Cypress.Commands.add('cleanupTestUser', async (email) => {
  cy.task('log', { message: '🧹 Starting cleanup of test user', email })
  
  try {
    // First get the user's ID using the admin client
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
    if (getUserError) {
      cy.task('log', { message: '❌ Error getting users list', error: getUserError })
      throw getUserError
    }

    const user = users.find(u => u.email === email)
    if (!user) {
      cy.task('log', { message: '💡 User not found, may already be deleted', email })
      return
    }

    // Delete the user using the admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      cy.task('log', { message: '❌ Error deleting user', error: deleteError })
      throw deleteError
    }

    cy.task('log', { message: '✅ Successfully deleted test user', email })
  } catch (error) {
    cy.task('log', { message: '❌ Error in cleanupTestUser', error })
    throw error
  }
})

Cypress.Commands.add('createTestUser', (email, password, additionalData = {}) => {
  cy.task('log', { message: '🔑 Creating test user', email, additionalData })
  return cy.wrap(
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: additionalData.fullName || email.split('@')[0],
          display_name: additionalData.displayName || additionalData.fullName || email.split('@')[0],
          role: additionalData.role || 'customer'
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

Cypress.Commands.add('supabaseSignIn', (email, password) => {
  cy.task('log', { message: '🔑 Signing in user', email })
  return cy.wrap(
    supabase.auth.signInWithPassword({
      email,
      password
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
    return response
  })
})