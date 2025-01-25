/// <reference types="cypress" />
import { logger } from '../../src/lib/node-logger.ts'

describe('Admin User Management', () => {
  const TEST_ADMIN_EMAIL = Cypress.env('ADMIN_EMAIL')
  const TEST_ADMIN_PASSWORD = Cypress.env('ADMIN_PASSWORD')
  const TEST_USER_EMAIL = 'test.user@example.com'
  const TEST_USER_NAME = 'Test User'

  beforeEach(() => {
    logger.methodEntry('beforeEach')
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.loginAsAdmin(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
    cy.visit('/users')
    logger.methodExit('beforeEach')
  })

  afterEach(() => {
    logger.methodEntry('afterEach')
    cy.cleanupTestUser(TEST_USER_EMAIL)
    logger.methodExit('afterEach')
  })

  it('should show user management interface', () => {
    logger.methodEntry('test: should show user management interface')
    // Verify page header
    cy.contains('Users').should('be.visible')

    // Verify table headers
    cy.get('table').within(() => {
      cy.contains('Name').should('be.visible')
      cy.contains('Role').should('be.visible')
      cy.contains('Open Tickets').should('be.visible')
      cy.contains('Total Tickets').should('be.visible')
    })
    logger.methodExit('test: should show user management interface')
  })

  it('should allow changing user roles', () => {
    logger.methodEntry('test: should allow changing user roles')
    // Create a test user first
    cy.task('log', { message: 'Creating test user' })
    cy.createTestUser(TEST_USER_EMAIL, TEST_USER_NAME, 'customer')

    // Wait for user to appear in table
    cy.contains(TEST_USER_NAME).should('be.visible')

    // Find the test user in the table
    cy.get('table').contains('tr', TEST_USER_NAME).within(() => {
      // Open role select
      cy.get('[aria-label="Change user role"]').click()
    })

    // Select service_rep role
    cy.get('[role="listbox"]').contains('service_rep').click()

    // Verify confirmation dialog
    cy.contains('Change Role').should('be.visible')
    cy.contains('button', 'Confirm').click()

    // Verify success toast
    cy.contains('User role updated').should('be.visible')

    // Verify role was updated in table
    cy.get('table').contains('tr', TEST_USER_NAME).within(() => {
      cy.contains('service_rep').should('be.visible')
    })
    logger.methodExit('test: should allow changing user roles')
  })

  it('should prevent changing last admin role', () => {
    logger.methodEntry('test: should prevent changing last admin role')
    // Find the admin user in the table
    cy.get('table').contains('tr', TEST_ADMIN_EMAIL).within(() => {
      // Try to change role
      cy.get('[aria-label="Change user role"]').click()
    })

    // Select customer role
    cy.get('[role="listbox"]').contains('customer').click()

    // Verify error toast
    cy.contains('Cannot change role of last admin').should('be.visible')

    // Verify admin role remains
    cy.get('table').contains('tr', TEST_ADMIN_EMAIL).within(() => {
      cy.contains('admin').should('be.visible')
    })
    logger.methodExit('test: should prevent changing last admin role')
  })

  it('should allow bulk role changes', () => {
    logger.methodEntry('test: should allow bulk role changes')
    // Create multiple test users
    const testUsers = [
      { email: 'test1@example.com', name: 'Test User 1' },
      { email: 'test2@example.com', name: 'Test User 2' },
    ]
    
    testUsers.forEach(user => {
      cy.task('log', { message: `Creating test user ${user.email}` })
      cy.createTestUser(user.email, user.name, 'customer')
    })

    // Wait for users to appear in table
    testUsers.forEach(user => {
      cy.contains(user.name).should('be.visible')
    })

    // Select test users
    testUsers.forEach(user => {
      cy.get('table').contains('tr', user.name).within(() => {
        cy.get('input[type="checkbox"]').click()
      })
    })

    // Click batch actions button
    cy.contains('button', 'Selected').click()
    cy.contains('Change Role').click()

    // Select service_rep role
    cy.get('[role="listbox"]').contains('service_rep').click()

    // Confirm bulk update
    cy.contains('button', 'Confirm').click()

    // Verify success toast
    cy.contains('Users updated').should('be.visible')

    // Verify roles were updated
    testUsers.forEach(user => {
      cy.get('table').contains('tr', user.name).within(() => {
        cy.contains('service_rep').should('be.visible')
      })
    })

    // Cleanup additional test users
    testUsers.forEach(user => {
      cy.cleanupTestUser(user.email)
    })
    logger.methodExit('test: should allow bulk role changes')
  })
})
