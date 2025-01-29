/// <reference types="cypress" />

describe('Admin User Management', () => {
  const TEST_ADMIN_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@example.com'
  const TEST_ADMIN_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'admin123'
  const TEST_USER_EMAIL = 'test.user@example.com'
  const TEST_USER_NAME = 'Test User'

  beforeEach(() => {
    cy.startLifecycleSegment('Setup', true)
    cy.pushToLog('Starting test setup')
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.supabaseSignIn(TEST_ADMIN_EMAIL, { password: TEST_ADMIN_PASSWORD })
    cy.visit('/users')
    cy.pushToLog('Waiting for users table')
    cy.get('table').should('be.visible')
    cy.get('table tbody tr').should('exist')
    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  })

  afterEach(() => {
    cy.startLifecycleSegment('Cleanup', false)
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.logStep('Test cleanup complete', { complete: true })
  })

  it('should show user management interface', () => {
    cy.startSegment('Interface Check')
    cy.logStep('Checking page header')
    cy.contains('Users').should('be.visible')

    cy.logStep('Verifying table headers')
    cy.get('table').within(() => {
      cy.contains('Name').should('be.visible')
      cy.contains('Role').should('be.visible')
      cy.contains('Open Tickets').should('be.visible')
      cy.contains('Total Tickets').should('be.visible')
    })
    cy.logStep('Test complete', { complete: true })
  })

  it('should allow changing user roles', () => {
    cy.startSegment('Role Change')
    cy.logStep('Creating test user', { email: TEST_USER_EMAIL })
    cy.createAdminManagedUser(TEST_USER_EMAIL, {
      fullName: TEST_USER_NAME,
      role: 'customer'
    })
    
    cy.logStep('Waiting for user creation to complete')
    cy.wait(1000)
    
    cy.logStep('Reloading page after user creation')
    cy.reload()
    
    cy.logStep('Waiting for table to be ready')
    cy.get('table').should('be.visible')
    cy.get('table tbody tr').should('exist')

    cy.logStep('Looking for test user in table')
    cy.contains('tr', TEST_USER_NAME, { timeout: 5000 }).click()

    cy.logStep('Changing user role')
    cy.contains('1 user selected').should('be.visible')
    cy.get('[data-testid="role-change-trigger"]').should('be.visible').click()
    cy.get('[data-testid="role-option-service-rep"]')
      .should('be.visible')
      .click({ force: true })

    cy.logStep('Confirming role change')
    cy.get('[data-testid="confirm-dialog"]').should('be.visible')
    cy.get('[data-testid="confirm-dialog-confirm"]').should('be.visible').click()

    cy.logStep('Verifying success message')
    cy.contains('Roles Updated').should('be.visible')
    cy.contains('Successfully updated').should('be.visible')

    cy.logStep('Verifying role update in table')
    cy.get('table').contains('tr', TEST_USER_NAME).within(() => {
      cy.contains('service_rep').should('be.visible')
    })
    cy.logStep('Test complete', { complete: true })
    cy.flushLogBuffer()
  })

  it('should prevent changing last admin role', () => {
    cy.startSegment('Last Admin Protection')
    cy.logStep('Looking for admin user')
    cy.get('table').contains('tr', TEST_ADMIN_EMAIL, { timeout: 5000 }).click()

    cy.logStep('Attempting to change admin role')
    cy.contains('1 user selected').should('be.visible')
    cy.get('[data-testid="role-change-trigger"]').should('be.visible').click()
    cy.get('[data-testid="role-option-customer"]')
      .should('be.visible')
      .click({ force: true })

    cy.logStep('Verifying error message')
    cy.contains('Cannot change role of last admin').should('be.visible')

    cy.logStep('Verifying admin role remains unchanged')
    cy.get('table').contains('tr', TEST_ADMIN_EMAIL).within(() => {
      cy.contains('admin').should('be.visible')
    })
    cy.logStep('Test complete', { complete: true })
  })

  it('should allow bulk role changes', () => {
    cy.startSegment('Bulk Role Change')
    cy.logStep('Creating test users')
    const testUsers = [
      { email: 'test1@example.com', name: 'Test User 1' },
      { email: 'test2@example.com', name: 'Test User 2' },
    ]
    
    cy.logStep('Cleaning up existing test users')
    cy.wrap(testUsers).each((user) => {
      cy.cleanupTestUser(user.email)
    })

    cy.logStep('Creating test users')
    cy.wrap(testUsers).each((user) => {
      cy.logStep(`Creating test user ${user.email}`)
      cy.createAdminManagedUser(user.email, {
        fullName: user.name,
        role: 'customer'
      })
      cy.wait(1000) // Wait for user creation to complete
    })

    cy.logStep('Reloading page after user creation')
    cy.reload()
    
    cy.logStep('Waiting for table to be ready')
    cy.get('table').should('be.visible')
    cy.get('table tbody tr').should('exist')

    cy.logStep('Looking for test users in table')
    cy.wrap(testUsers).each((user) => {
      cy.contains('tr', user.name, { timeout: 5000 }).click()
    })

    cy.logStep('Verifying batch actions')
    cy.contains('2 users selected').should('be.visible')

    cy.logStep('Changing user roles')
    cy.get('[data-testid="role-change-trigger"]').should('be.visible').click()
    cy.get('[data-testid="role-option-service-rep"]')
      .should('be.visible')
      .click({ force: true })

    cy.logStep('Confirming role changes')
    cy.get('[data-testid="confirm-dialog"]').should('be.visible')
    cy.get('[data-testid="confirm-dialog-confirm"]').should('be.visible').click()

    cy.logStep('Verifying success message')
    cy.contains('Roles Updated').should('be.visible')
    cy.contains('Successfully updated').should('be.visible')

    cy.logStep('Verifying role updates in table')
    cy.wrap(testUsers).each((user) => {
      cy.get('table').contains('tr', user.name).within(() => {
        cy.contains('service_rep').should('be.visible')
      })
    })

    cy.logStep('Cleaning up test users')
    cy.wrap(testUsers).each((user) => {
      cy.cleanupTestUser(user.email)
    })
    cy.logStep('Test complete', { complete: true })
  })
})
