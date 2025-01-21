/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/auth')
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('should allow switching between login and signup tabs', () => {
    // Start on login tab
    cy.contains('Login').should('have.attr', 'aria-selected', 'true')
    cy.contains('Sign Up').should('have.attr', 'aria-selected', 'false')

    // Switch to signup tab
    cy.contains('Sign Up').click()
    cy.contains('Sign Up').should('have.attr', 'aria-selected', 'true')
    cy.contains('Login').should('have.attr', 'aria-selected', 'false')

    // Verify form fields
    cy.get('input[id="fullName"]').should('be.visible')
    cy.get('input[id="email"]').should('be.visible')
    cy.get('input[id="password"]').should('be.visible')
    cy.get('input[id="confirmPassword"]').should('be.visible')

    // Switch back to login tab
    cy.contains('Login').click()
    cy.contains('Login').should('have.attr', 'aria-selected', 'true')
    cy.contains('Sign Up').should('have.attr', 'aria-selected', 'false')

    // Verify form fields
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
  })

  it('should login as demo customer', () => {
    // Click demo customer button
    cy.contains('Sign in as Customer').click()

    // Wait for auth state to update and localStorage to be populated
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for navigation to complete
    cy.url().should('include', '/dashboard')

    // Verify we're on the dashboard
    cy.get('nav').within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Logout').should('be.visible')
    })
  })

  it('should login as demo service rep', () => {
    // Click demo service rep button
    cy.contains('Sign in as Service Rep').click()

    // Wait for auth state to update and localStorage to be populated
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for navigation to complete
    cy.url().should('include', '/dashboard')

    // Verify we're on the dashboard
    cy.get('nav').within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Logout').should('be.visible')
    })
  })

  it('should register a new user and login', () => {
    // Switch to signup tab
    cy.contains('Sign Up').click()

    // Fill in registration form
    cy.get('input[id="fullName"]').type('New Test User')
    cy.get('input[id="email"]').type('newuser@example.com')
    cy.get('input[id="password"]').type('Password123!')
    cy.get('input[id="confirmPassword"]').type('Password123!')

    // Submit form
    cy.get('button[type="submit"]').contains('Create Account').click()

    // Wait for auth state to update and localStorage to be populated
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for navigation to complete
    cy.url().should('include', '/dashboard')

    // Verify we're on the dashboard
    cy.get('nav').within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Logout').should('be.visible')
    })

    // Logout
    cy.contains('Logout').click()

    // Should redirect to auth page
    cy.url().should('include', '/auth')

    // Login with new account
    cy.get('input[type="email"]').type('newuser@example.com')
    cy.get('input[type="password"]').type('Password123!')
    cy.get('button[type="submit"]').contains('Sign In').click()

    // Wait for auth state to update and localStorage to be populated
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for navigation to complete
    cy.url().should('include', '/dashboard')

    // Verify we're on the dashboard
    cy.get('nav').within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Logout').should('be.visible')
    })
  })

  it('should handle invalid login attempts', () => {
    // Try logging in with invalid credentials
    cy.get('input[type="email"]').type('invalid@example.com')
    cy.get('input[type="password"]').type('WrongPassword123!')
    cy.get('button[type="submit"]').contains('Sign In').click()

    // Should show error toast
    cy.contains('Error').should('be.visible')
    cy.contains('Failed to sign in').should('be.visible')

    // Should stay on auth page
    cy.url().should('include', '/auth')
  })

  it('should prevent access to protected routes when not logged in', () => {
    // Try accessing dashboard directly
    cy.visit('/dashboard')

    // Should redirect to auth page
    cy.url().should('include', '/auth')
  })

  it('should maintain session after page reload', () => {
    // Login as demo customer
    cy.contains('Sign in as Customer').click()

    // Wait for auth state to update and localStorage to be populated
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for navigation to complete
    cy.url().should('include', '/dashboard')

    // Verify we're on the dashboard
    cy.get('nav').within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Logout').should('be.visible')
    })

    // Reload page
    cy.reload()

    // Should stay on dashboard
    cy.url().should('include', '/dashboard')

    // Verify we're still logged in
    cy.get('nav').within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Logout').should('be.visible')
    })
  })

  it('should handle logout', () => {
    // Login as demo customer
    cy.contains('Sign in as Customer').click()

    // Wait for auth state to update and localStorage to be populated
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for navigation to complete
    cy.url().should('include', '/dashboard')

    // Verify we're on the dashboard
    cy.get('nav').within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Logout').should('be.visible')
    })

    // Logout
    cy.contains('Logout').click()

    // Should redirect to auth page
    cy.url().should('include', '/auth')

    // Verify localStorage is cleared
    cy.window().its('localStorage.length').should('eq', 0)
  })
}) 