/// <reference types="cypress" />
import './commands.js'
import { supabase, supabaseAdmin } from './supabase.js'
import { logger } from '../../src/lib/node-logger.ts'

Cypress.Commands.add('cleanupTestUser', async (email) => {
  logger.methodEntry('cleanupTestUser', { email })
  
  try {
    // First get the user's ID using the admin client
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
    if (getUserError) {
      logger.error('Error getting users list', { error: JSON.stringify(getUserError) })
      throw getUserError
    }

    const user = users.find(u => u.email === email)
    if (!user) {
      logger.info('User not found, may already be deleted', { email })
      logger.methodExit('cleanupTestUser')
      return
    }

    // Delete the user using the admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      logger.error('Error deleting user', { error: JSON.stringify(deleteError) })
      throw deleteError
    }

    logger.info('Successfully deleted test user', { email })
    logger.methodExit('cleanupTestUser')
  } catch (error) {
    logger.error('Error in cleanupTestUser', { error: JSON.stringify(error) })
    throw error
  }
})

Cypress.Commands.add('createTestUser', (email, password, additionalData = {}) => {
  logger.methodEntry('createTestUser', { email, additionalData: JSON.stringify(additionalData) })
  return cy.wrap(
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: additionalData.full_name || email.split('@')[0],
          display_name: additionalData.display_name || email.split('@')[0],
          role: additionalData.role || 'customer',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
  ).then((response) => {
    if (response.error) {
      logger.error('Error creating test user', { error: JSON.stringify(response.error) })
      throw response.error
    }
    logger.info('Successfully created test user', { 
      userId: response.data?.user?.id,
      email,
      metadata: response.data?.user?.user_metadata
    })
    logger.methodExit('createTestUser')
    return response
  })
})

Cypress.Commands.add('supabaseSignIn', (email, password) => {
  logger.methodEntry('supabaseSignIn', { email })
  return cy.wrap(
    supabase.auth.signInWithPassword({
      email,
      password
    })
  ).then((response) => {
    if (response.error) {
      logger.error('Error signing in', { error: JSON.stringify(response.error) })
      throw response.error
    }
    logger.info('Successfully signed in', { 
      userId: response.data?.user?.id,
      email,
      metadata: response.data?.user?.user_metadata
    })
    logger.methodExit('supabaseSignIn')
    return response
  })
}) 