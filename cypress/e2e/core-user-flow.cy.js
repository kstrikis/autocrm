/// <reference types="cypress" />

describe('Core User Flow', () => {
  beforeEach(() => {
    cy.cleanupTestUser('test@example.com')
    cy.visit('/auth')
    cy.clearCookies()
  })

  it('should successfully log in as guest', () => {
    // Click demo customer button
    cy.contains('Demo Customer').click()

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Should show success toast
    cy.contains('Success', { timeout: 2000 }).should('be.visible')
    cy.contains('You have been logged in successfully', { timeout: 2000 }).should('be.visible')

    // Should show user info in nav
    cy.get('nav', { timeout: 2000 }).within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Alice Customer').should('be.visible')
    })
  })

  it('should persist user session after refresh', () => {
    // Click demo customer button
    cy.contains('Demo Customer').click()

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Should show user info in nav
    cy.get('nav', { timeout: 2000 }).within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Alice Customer').should('be.visible')
    })

    // Reload page
    cy.reload()

    // Should stay on dashboard
    cy.url().should('include', '/dashboard')

    // Should still show user info
    cy.get('nav', { timeout: 2000 }).within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Alice Customer').should('be.visible')
    })
  })

  it('should log out and redirect to login page', () => {
    // Click demo customer button
    cy.contains('Demo Customer').click()

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Should show user info in nav
    cy.get('nav', { timeout: 2000 }).within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Alice Customer').should('be.visible')
    })

    // Click logout
    cy.contains('Logout').click()

    // Should redirect to auth page
    cy.url().should('include', '/auth')

    // Try accessing protected route
    cy.visit('/dashboard')

    // Should redirect back to auth
    cy.url().should('include', '/auth')
  })

  it('should prevent direct access to dashboard when not logged in', () => {
    // Try accessing protected route without logging in
    cy.visit('/dashboard')

    // Should redirect to auth page
    cy.url().should('include', '/auth')
  })

  it('should show logged-in user status', () => {
    // Click demo customer button
    cy.contains('Demo Customer').click()

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Should show user info in nav
    cy.get('nav', { timeout: 2000 }).within(() => {
      cy.contains('Welcome').should('be.visible')
      cy.contains('Alice Customer').should('be.visible')
    })
  })
}) 