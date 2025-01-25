/// <reference types="cypress" />

describe('Authentication Flow', () => {
  const TEST_USER_EMAIL = 'test@example.com'
  const TEST_USER_PASSWORD = 'StrongP@ssw0rd123!'
  const TEST_USER_NAME = 'Test User'

  beforeEach(() => {
    cy.task('log', { message: '🔄 Starting test setup' })
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/')
    cy.task('log', { message: '✅ Test setup complete' })
  })

  afterEach(() => {
    cy.task('log', { message: '🧹 Starting test cleanup' })
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.task('log', { message: '✅ Test cleanup complete' })
  })

  it('should show welcome message and auth options', () => {
    cy.task('log', { message: '🔍 Checking welcome message and auth options' })
    // Verify page header
    cy.contains('Welcome to AutoCRM').should('be.visible')
    cy.contains('Sign in or create an account to get started').should('be.visible')

    // Verify tabs
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Login').should('be.visible')
      cy.contains('Sign Up').should('be.visible')
    })

    // Verify demo account section
    cy.contains('Try our demo accounts:').should('be.visible')
    cy.contains('Demo Customer').should('be.visible')
    cy.contains('Demo Service Rep').should('be.visible')
    cy.contains('Demo Admin').should('be.visible')
    cy.task('log', { message: '✅ Welcome page verification complete' })
  })

  it('should validate login form fields', () => {
    cy.task('log', { message: '🔍 Testing login form validation' })
    // Try submitting empty form
    cy.get('button').contains('Sign In').click()

    // Should show validation errors
    cy.contains('Invalid email address').should('be.visible')
    cy.contains('Password must be at least 6 characters').should('be.visible')

    // Try invalid email
    cy.get('input[type="email"]').type('invalid-email')
    cy.get('button').contains('Sign In').click()
    cy.contains('Invalid email address').should('be.visible')
    cy.task('log', { message: '✅ Login form validation complete' })
  })

  it('should validate signup form fields', () => {
    cy.task('log', { message: '🔍 Testing signup form validation' })
    // Switch to signup tab
    cy.contains('Sign Up').click()

    // Try submitting empty form
    cy.get('button').contains('Create Account').click()

    // Should show validation errors
    cy.contains('Full name must be at least 2 characters').should('be.visible')
    cy.contains('Invalid email address').should('be.visible')

    // Try weak password
    cy.get('input[name="fullName"]').type(TEST_USER_NAME)
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type('weak')
    cy.get('input[name="confirmPassword"]').type('weak')
    cy.get('button').contains('Create Account').click()

    // Should show password strength indicator and validation message
    cy.contains('Password strength: Weak').should('be.visible')
    cy.contains('Password is too weak').should('be.visible')

    // Try stronger but mismatched passwords
    cy.get('input[name="password"]').clear().type(TEST_USER_PASSWORD)
    cy.get('input[name="confirmPassword"]').clear().type('DifferentP@ssw0rd123!')
    cy.get('button').contains('Create Account').click()
    cy.contains("Passwords don't match").should('be.visible')
    cy.task('log', { message: '✅ Signup form validation complete' })
  })

  it('should handle successful signup and login', () => {
    cy.task('log', { message: '🔍 Testing successful signup flow' })
    // Switch to signup tab
    cy.contains('Sign Up').click()

    // Fill out signup form
    cy.get('input[name="fullName"]').type(TEST_USER_NAME)
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type(TEST_USER_PASSWORD)
    cy.get('input[name="confirmPassword"]').type(TEST_USER_PASSWORD)
    cy.get('button').contains('Create Account').click()

    // Should show success message and redirect to dashboard
    cy.contains('Success').should('be.visible')
    cy.url().should('include', '/dashboard')
    cy.task('log', { message: '✅ Signup successful' })

    // Sign out
    cy.contains('Logout').click()
    cy.task('log', { message: '🔍 Testing login with new account' })

    // Try logging in with new account
    cy.visit('/auth')
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type(TEST_USER_PASSWORD)
    cy.get('button').contains('Sign In').click()

    // Should redirect to dashboard after login
    cy.url().should('include', '/dashboard')
    cy.task('log', { message: '✅ Login successful' })
  })

  it('should handle demo account login', () => {
    cy.task('log', { message: '🔍 Testing demo account login' })
    // Click demo customer button
    cy.contains('Demo Customer').click()
    cy.url().should('include', '/dashboard')
    cy.task('log', { message: '✅ Demo customer login successful' })

    // Sign out
    cy.contains('Logout').click()

    // Try demo service rep
    cy.visit('/auth')
    cy.contains('Demo Service Rep').click()
    cy.url().should('include', '/dashboard')
    cy.task('log', { message: '✅ Demo service rep login successful' })
  })

  it('should handle invalid login attempts', () => {
    cy.task('log', { message: '🔍 Testing invalid login attempts' })
    // Try logging in with invalid credentials
    cy.get('input[type="email"]').type('invalid@example.com')
    cy.get('input[type="password"]').type('WrongPassword123!')
    cy.get('button').contains('Sign In').click()

    // Should show error toast
    cy.contains('Error', { timeout: 2000 }).should('be.visible')
    cy.contains('Failed to sign in', { timeout: 2000 }).should('be.visible')

    // Should stay on auth page
    cy.url().should('include', '/auth')
    cy.task('log', { message: '✅ Invalid login handling verified' })
  })
})