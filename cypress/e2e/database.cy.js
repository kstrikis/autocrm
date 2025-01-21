/// <reference types="cypress" />
import { supabase } from '../../src/lib/supabase'

describe('Database Operations', () => {
  beforeEach(() => {
    cy.visit('/auth')
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('should create user profile on signup', () => {
    // Sign up as a new user
    cy.get('button').contains('Sign Up').click()
    cy.get('input[name="fullName"]').type('Test User')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Wait for auth state to update
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Verify profile was created
    cy.wrap(supabase.from('user_profiles').select('*').eq('email', 'test@example.com'))
      .its('data.0')
      .should('exist')
      .and('have.property', 'full_name', 'Test User')
  })

  it('should enforce RLS policies for profile access', () => {
    // Sign in as demo customer
    cy.get('input[name="email"]').type('customer@example.com')
    cy.get('input[name="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Wait for auth state to update
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Try to update own profile (should succeed)
    cy.wrap(supabase.from('user_profiles')
      .update({ full_name: 'Updated Name' })
      .eq('email', 'customer@example.com')
    ).its('error').should('be.null')

    // Try to update another profile (should fail)
    cy.wrap(supabase.from('user_profiles')
      .update({ full_name: 'Hacked Name' })
      .eq('email', 'service@example.com')
    ).its('error').should('exist')
  })

  it('should enforce role-based access control', () => {
    // Sign in as demo customer
    cy.get('input[name="email"]').type('customer@example.com')
    cy.get('input[name="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Wait for auth state to update
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Try to change role (should fail)
    cy.wrap(supabase.from('user_profiles')
      .update({ role: 'admin' })
      .eq('email', 'customer@example.com')
    ).its('error').should('exist')

    // Update non-role field (should succeed)
    cy.wrap(supabase.from('user_profiles')
      .update({ full_name: 'New Name' })
      .eq('email', 'customer@example.com')
    ).its('error').should('be.null')
  })

  it('should handle profile deletion on user deletion', () => {
    // Create a test user
    const email = `test${Date.now()}@example.com`
    const password = 'Password123!'

    cy.wrap(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      })
    ).then(async ({ data: { user } }) => {
      // Verify profile exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      expect(profile).to.exist

      // Delete user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user?.id)
      expect(deleteError).to.be.null

      // Verify profile was deleted
      const { data: deletedProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      expect(deletedProfile).to.be.null
    })
  })

  it('should allow reading all profiles when authenticated', () => {
    // Login as demo customer
    cy.wrap(
      supabase.auth.signInWithPassword({
        email: 'customer@example.com',
        password: 'Password123!',
      })
    ).then(async () => {
      // Should be able to read all profiles
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')

      expect(error).to.be.null
      expect(profiles).to.have.length.at.least(2) // Demo customer and service rep
    })
  })

  it('should prevent unauthenticated access', () => {
    // Try to access profiles without authentication
    cy.wrap(
      supabase.from('user_profiles').select('*')
    ).then(({ error }) => {
      expect(error).to.exist
    })
  })
}) 