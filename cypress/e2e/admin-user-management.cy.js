/// <reference types="cypress" />

describe('Admin User Management', () => {
  const TEST_ADMIN_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@example.com'
  const TEST_ADMIN_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'admin123'
  const TEST_USER_EMAIL = 'test.user@example.com'
  const TEST_USER_NAME = 'Test User'

  beforeEach(() => {
    cy.task('log', { message: ' Starting test setup' })
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.loginAsAdmin(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
    cy.visit('/users')
    // Wait for the table to load and be ready
    cy.task('log', { message: 'Waiting for users table to load' })
    cy.get('table').should('be.visible')
    cy.get('table tbody tr').should('exist')
    cy.task('log', { message: 'Test setup complete' })
  })

  afterEach(() => {
    cy.task('log', { message: ' Starting test cleanup' })
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.task('log', { message: 'Test cleanup complete' })
  })

  it('should show user management interface', () => {
    cy.task('log', { message: 'Checking user management interface' })
    // Verify page header
    cy.task('log', { message: 'Verifying page header' })
    cy.contains('Users').should('be.visible')

    // Verify table headers
    cy.task('log', { message: 'Verifying table headers' })
    cy.get('table').within(() => {
      cy.contains('Name').should('be.visible')
      cy.contains('Role').should('be.visible')
      cy.contains('Open Tickets').should('be.visible')
      cy.contains('Total Tickets').should('be.visible')
    })
    cy.task('log', { message: 'User management interface verified' })
  })

  it('should allow changing user roles', () => {
    cy.task('log', { message: 'Creating test user', email: TEST_USER_EMAIL })
    cy.createAdminManagedUser(TEST_USER_EMAIL, TEST_USER_NAME, 'customer')
    
    // Wait for user creation to complete
    cy.wait(1000)
    
    cy.task('log', { message: 'Reloading page after user creation' })
    cy.reload()
    
    // Wait for table to be ready
    cy.get('table').should('be.visible')
    cy.get('table tbody tr').should('exist')

    // Wait for user to appear in table and select it
    cy.task('log', { message: 'Looking for test user in table' })
    cy.contains('tr', TEST_USER_NAME, { timeout: 5000 }).within(() => {
      cy.get('input[type="checkbox"]').should('be.visible').click()
    })

    // Change role using batch actions
    cy.task('log', { message: 'Changing user role' })
    cy.contains('1 user selected').should('be.visible')
    cy.contains('Change role to...').should('be.visible').click()
    cy.contains('service_rep').should('be.visible').click()

    // Verify confirmation dialog
    cy.task('log', { message: 'Confirming role change' })
    cy.contains('Change Role').should('be.visible')
    cy.contains('button', 'Confirm').should('be.visible').click()

    // Verify success toast
    cy.task('log', { message: 'Verifying success message' })
    cy.contains('User role updated').should('be.visible')

    // Verify role was updated in table
    cy.task('log', { message: 'Verifying role update in table' })
    cy.get('table').contains('tr', TEST_USER_NAME).within(() => {
      cy.contains('service_rep').should('be.visible')
    })
    cy.task('log', { message: 'User role change verified' })
  })

  it('should prevent changing last admin role', () => {
    // Find and select the admin user
    cy.task('log', { message: 'Looking for admin user', email: TEST_ADMIN_EMAIL })
    cy.get('table').contains('tr', TEST_ADMIN_EMAIL, { timeout: 5000 }).within(() => {
      cy.get('input[type="checkbox"]').should('be.visible').click()
    })

    // Try to change role using batch actions
    cy.task('log', { message: 'Attempting to change admin role' })
    cy.contains('1 user selected').should('be.visible')
    cy.contains('Change role to...').should('be.visible').click()
    cy.contains('customer').should('be.visible').click()

    // Verify error toast
    cy.task('log', { message: 'Verifying error message' })
    cy.contains('Cannot change role of last admin').should('be.visible')

    // Verify admin role remains
    cy.task('log', { message: 'Verifying admin role remains unchanged' })
    cy.get('table').contains('tr', TEST_ADMIN_EMAIL).within(() => {
      cy.contains('admin').should('be.visible')
    })
    cy.task('log', { message: 'Admin role protection verified' })
  })

  it('should allow bulk role changes', () => {
    // Create multiple test users
    const testUsers = [
      { email: 'test1@example.com', name: 'Test User 1' },
      { email: 'test2@example.com', name: 'Test User 2' },
    ]
    
    // Clean up any existing test users first
    cy.task('log', { message: 'Cleaning up existing test users' })
    cy.wrap(testUsers).each((user) => {
      cy.cleanupTestUser(user.email)
    })

    // Create users sequentially and wait for each one
    cy.task('log', { message: 'Creating test users' })
    cy.wrap(testUsers).each((user) => {
      cy.task('log', { message: `Creating test user ${user.email}` })
      cy.createAdminManagedUser(user.email, user.name, 'customer')
      cy.wait(1000) // Wait for user creation to complete
    })

    cy.task('log', { message: 'Reloading page after user creation' })
    cy.reload()
    
    // Wait for table to be ready
    cy.get('table').should('be.visible')
    cy.get('table tbody tr').should('exist')

    // Wait for users to appear in table and select them
    cy.task('log', { message: 'Looking for test users in table' })
    cy.wrap(testUsers).each((user) => {
      cy.contains('tr', user.name, { timeout: 5000 }).within(() => {
        cy.get('input[type="checkbox"]').should('be.visible').click()
      })
    })

    // Verify batch actions appear
    cy.task('log', { message: 'Verifying batch actions' })
    cy.contains('2 users selected').should('be.visible')

    // Change roles using batch actions
    cy.task('log', { message: 'Changing user roles' })
    cy.contains('Change role to...').should('be.visible').click()
    cy.contains('service_rep').should('be.visible').click()

    // Confirm bulk update
    cy.task('log', { message: 'Confirming role changes' })
    cy.contains('button', 'Confirm').should('be.visible').click()

    // Verify success toast
    cy.task('log', { message: 'Verifying success message' })
    cy.contains('Users updated').should('be.visible')

    // Verify roles were updated
    cy.task('log', { message: 'Verifying role updates in table' })
    cy.wrap(testUsers).each((user) => {
      cy.get('table').contains('tr', user.name).within(() => {
        cy.contains('service_rep').should('be.visible')
      })
    })

    // Cleanup additional test users
    cy.task('log', { message: 'Cleaning up test users' })
    cy.wrap(testUsers).each((user) => {
      cy.cleanupTestUser(user.email)
    })
    cy.task('log', { message: 'Bulk role changes verified' })
  })
})
