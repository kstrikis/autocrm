/// <reference types="cypress" />

describe('Core User Flow', () => {
  const TEST_USER = 'Test Guest User'

  beforeEach(() => {
    cy.clearLocalStorage()
  })

  it('should successfully log in as guest', () => {
    // Visit homepage
    cy.visit('/')

    // Sign in as guest
    cy.get('input[placeholder*="guest name"]', { timeout: 10000 }).should('be.visible').type(TEST_USER)
    cy.get('button').contains(/join as guest/i).click()

    // Verify we're logged in and in the dashboard
    cy.url().should('include', '/dashboard')
    cy.contains(TEST_USER, { timeout: 10000 }).should('be.visible')
    cy.contains('Welcome!', { timeout: 10000 }).should('be.visible')
  })

  it('should persist user session after refresh', () => {
    // Visit and login
    cy.visit('/')
    cy.get('input[placeholder*="guest name"]', { timeout: 10000 }).should('be.visible').type(TEST_USER)
    cy.get('button').contains(/join as guest/i).click()

    // Wait for the dashboard to load
    cy.contains(TEST_USER, { timeout: 10000 }).should('be.visible')

    // Verify localStorage has the user data
    cy.window().its('localStorage').invoke('getItem', 'autocrm_user').should('exist')

    // Refresh the page
    cy.reload()

    // Wait for loading state to clear
    cy.contains('Loading...').should('not.exist')

    // Verify we're still logged in
    cy.url().should('include', '/dashboard')
    cy.contains(TEST_USER, { timeout: 10000 }).should('be.visible')
  })

  it('should log out and redirect to login page', () => {
    // Visit and login
    cy.visit('/')
    cy.get('input[placeholder*="guest name"]', { timeout: 10000 }).should('be.visible').type(TEST_USER)
    cy.get('button').contains(/join as guest/i).click()

    // Wait for the dashboard to load
    cy.contains(TEST_USER, { timeout: 10000 }).should('be.visible')

    // Click logout button and wait for user state to be cleared
    cy.get('button[aria-label="Logout"]').click()
    cy.window().its('localStorage').invoke('getItem', 'autocrm_user').should('not.exist')

    // Verify we're back at the login page
    cy.get('input[placeholder*="guest name"]', { timeout: 10000 }).should('be.visible')
    cy.get('button').contains(/join as guest/i).should('be.visible')

    // Verify we can't access dashboard directly
    cy.visit('/dashboard')
    cy.get('input[placeholder*="guest name"]', { timeout: 10000 }).should('be.visible')
    cy.get('button').contains(/join as guest/i).should('be.visible')
  })

  it('should prevent direct access to dashboard when not logged in', () => {
    // Try to access dashboard directly
    cy.visit('/dashboard')

    // Should be redirected to login page
    cy.url().should('eq', 'http://localhost:5173/')
    cy.get('input[placeholder*="guest name"]', { timeout: 10000 }).should('be.visible')
    cy.get('button').contains(/join as guest/i).should('be.visible')
  })

  it('should show logged-in user status', () => {
    // Visit and login
    cy.visit('/')
    cy.get('input[placeholder*="guest name"]', { timeout: 10000 }).should('be.visible').type(TEST_USER)
    cy.get('button').contains(/join as guest/i).click()

    // Wait for the dashboard to load
    cy.contains(TEST_USER, { timeout: 10000 }).should('be.visible')

    // Verify user status is shown
    cy.get('[data-cy="user-status"]')
      .should('exist')
      .and('contain', 'online')
  })
}) 