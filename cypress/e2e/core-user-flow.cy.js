/// <reference types="cypress" />

describe('Core User Flow', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.visit('/auth')
  })

  it('should successfully log in as guest', () => {
    // Click demo customer button
    cy.contains('Sign in as Customer').click()

    // Wait for auth state to update
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Should show success toast
    cy.contains('Success').should('be.visible')
    cy.contains('You have been logged in successfully').should('be.visible')
  })

  it('should persist user session after refresh', () => {
    // Login as demo customer
    cy.contains('Sign in as Customer').click()

    // Wait for auth state to update
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for the dashboard to load
    cy.url().should('include', '/dashboard')

    // Verify localStorage has the session
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Reload page
    cy.reload()

    // Wait for loading state to clear
    cy.contains('Loading...').should('not.exist')

    // Should stay on dashboard
    cy.url().should('include', '/dashboard')
  })

  it('should log out and redirect to login page', () => {
    // Login as demo customer
    cy.contains('Sign in as Customer').click()

    // Wait for auth state to update
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for the dashboard to load
    cy.url().should('include', '/dashboard')

    // Click logout button
    cy.contains('Logout').click()

    // Should redirect to auth page
    cy.url().should('include', '/auth')

    // Verify localStorage is cleared
    cy.window().its('localStorage').should('have.length', 0)

    // Try accessing dashboard directly
    cy.visit('/dashboard')

    // Should be redirected to auth page
    cy.url().should('include', '/auth')
  })

  it('should prevent direct access to dashboard when not logged in', () => {
    // Try accessing dashboard directly
    cy.visit('/dashboard')

    // Should redirect to auth page
    cy.url().should('include', '/auth')
  })

  it('should show logged-in user status', () => {
    // Login as demo customer
    cy.contains('Sign in as Customer').click()

    // Wait for auth state to update
    cy.window().its('localStorage').should('have.length.gt', 0)

    // Wait for the dashboard to load
    cy.url().should('include', '/dashboard')

    // Verify user status is shown
    cy.get('[data-cy="user-status"]')
      .should('exist')
      .and('contain', 'online')
  })
}) 