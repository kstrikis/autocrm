/// <reference types="cypress" />
import { supabase, supabaseAdmin } from '../support/supabase.js'

describe('Database Operations', () => {
  beforeEach(() => {
    cy.cleanupTestUser('test@example.com')
    cy.visit('/auth')
    cy.clearCookies()
  })

  it('should create user profile on signup', () => {
    // Switch to signup tab
    cy.contains('Sign Up').click()

    // Fill in signup form
    cy.get('input[name="fullName"]').type('Test User')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('StrongP@ssw0rd123!')
    cy.get('input[name="confirmPassword"]').type('StrongP@ssw0rd123!')
    cy.get('button').contains('Sign Up').click()

    // Should show success toast and redirect
    cy.contains('Success', { timeout: 2000 }).should('be.visible')
    cy.url().should('include', '/dashboard')

    // Verify profile was created
    cy.wrap(supabase.from('user_profiles').select('*').eq('email', 'test@example.com'))
      .its('data.0')
      .should('exist')
      .and('have.property', 'full_name', 'Test User')
  })

  it('should enforce RLS policies for profile access', () => {
    // Login as demo customer
    cy.contains('Demo Customer').click()

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Try to update own profile (should succeed)
    cy.wrap(supabase.from('user_profiles')
      .update({ display_name: 'Updated Name' })
      .eq('email', 'customer1@example.com')
    ).its('error').should('be.null')

    // Try to update another profile (should fail)
    cy.wrap(supabase.from('user_profiles')
      .update({ display_name: 'Hacked Name' })
      .eq('email', 'service1@example.com')
    ).its('error').should('exist')
  })

  it('should enforce role-based access control', () => {
    // Login as demo customer
    cy.contains('Demo Customer').click()

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Try to change role (should fail)
    cy.wrap(supabase.from('user_profiles')
      .update({ role: 'admin' })
      .eq('email', 'customer1@example.com')
    ).its('error').should('exist')

    // Update non-role field (should succeed)
    cy.wrap(supabase.from('user_profiles')
      .update({ display_name: 'New Name' })
      .eq('email', 'customer1@example.com')
    ).its('error').should('be.null')
  })

  it('should handle profile deletion on user deletion', () => {
    // Create a test user
    const email = `test${Date.now()}@example.com`
    const password = 'StrongP@ssw0rd123!'

    cy.wrap(
      supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User',
        },
      })
    ).then(async ({ data: { user } }) => {
      // Verify profile exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      expect(profile).to.exist

      // Delete user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user?.id)
      expect(deleteError).to.be.null

      // Verify profile was deleted
      const { data: deletedProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      expect(deletedProfile).to.be.null
    })
  })

  it('should allow reading all profiles when authenticated', () => {
    // Login as demo customer
    cy.contains('Demo Customer').click()

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Should be able to read all profiles
    cy.wrap(
      supabase.from('user_profiles').select('*')
    ).then(({ data, error }) => {
      expect(error).to.be.null
      expect(data).to.have.length.at.least(2) // Demo customer and service rep
    })
  })

  it('should prevent unauthenticated access', () => {
    // Try to access profiles without authentication
    cy.wrap(
      supabase.from('user_profiles').select('*')
    ).then(({ data, error }) => {
      expect(data).to.be.null
      expect(error).to.exist
    })
  })
}) 