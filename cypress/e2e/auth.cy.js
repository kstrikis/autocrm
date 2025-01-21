/// <reference types="cypress" />
import { logger } from '../../src/lib/node-logger.ts'

describe('Authentication Flow', () => {
  const TEST_USER_EMAIL = 'test@example.com'
  const TEST_USER_PASSWORD = 'StrongP@ssw0rd123!'
  const TEST_USER_NAME = 'Test User'

  beforeEach(() => {
    logger.methodEntry('beforeEach')
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/auth')
    logger.methodExit('beforeEach')
  })

  afterEach(() => {
    logger.methodEntry('afterEach')
    cy.cleanupTestUser(TEST_USER_EMAIL)
    logger.methodExit('afterEach')
  })

  it('should show welcome message and auth options', () => {
    logger.methodEntry('test: should show welcome message')
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
    logger.methodExit('test: should show welcome message')
  })

  it('should validate login form fields', () => {
    logger.methodEntry('test: should validate login form')
    // Try submitting empty form
    cy.get('button').contains('Sign In').click()

    // Should show validation errors
    cy.contains('Invalid email address').should('be.visible')
    cy.contains('Password must be at least 6 characters').should('be.visible')

    // Try invalid email
    cy.get('input[type="email"]').type('invalid-email')
    cy.get('button').contains('Sign In').click()
    cy.contains('Invalid email address').should('be.visible')
    logger.methodExit('test: should validate login form')
  })

  it('should validate signup form fields', () => {
    // Switch to signup tab
    cy.contains('Sign Up').click()

    // Try submitting empty form
    cy.get('button').contains('Create Account').click()

    // Should show validation errors
    cy.contains('Full name must be at least 2 characters').should('be.visible')
    cy.contains('Invalid email address').should('be.visible')
    cy.contains('Password must be at least 8 characters').should('be.visible')

    // Try weak password
    cy.get('input[name="fullName"]').type(TEST_USER_NAME)
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type('weak')
    cy.get('input[name="confirmPassword"]').type('weak')
    cy.get('button').contains('Create Account').click()

    // Should show password strength indicator and validation message
    cy.contains('Password strength: Weak').should('be.visible')
    cy.contains('Password must be at least 8 characters').should('be.visible')

    // Try stronger but mismatched passwords
    cy.get('input[name="password"]').clear().type(TEST_USER_PASSWORD)
    cy.get('input[name="confirmPassword"]').clear().type('DifferentP@ssw0rd123!')
    cy.get('button').contains('Create Account').click()
    cy.contains("Passwords don't match").should('be.visible')
  })

  it('should handle successful signup and login', () => {
    logger.methodEntry('test: should handle successful signup')
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

    // Sign out
    cy.contains('Logout').click()

    // Try logging in with new account
    cy.visit('/auth')
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type(TEST_USER_PASSWORD)
    cy.get('button').contains('Sign In').click()

    // Should redirect to dashboard after login
    cy.url().should('include', '/dashboard')
    logger.methodExit('test: should handle successful signup')
  })

  it('should handle demo account login', () => {
    logger.methodEntry('test: should handle demo login')
    // Click demo customer button
    cy.contains('Demo Customer').click()
    cy.url().should('include', '/dashboard')

    // Sign out
    cy.contains('Logout').click()

    // Try demo service rep
    cy.visit('/auth')
    cy.contains('Demo Service Rep').click()
    cy.url().should('include', '/dashboard')
    logger.methodExit('test: should handle demo login')
  })

  it('should handle invalid login attempts', () => {
    // Try logging in with invalid credentials
    cy.get('input[type="email"]').type('invalid@example.com')
    cy.get('input[type="password"]').type('WrongPassword123!')
    cy.get('button').contains('Sign In').click()

    // Should show error toast
    cy.contains('Error', { timeout: 2000 }).should('be.visible')
    cy.contains('Failed to sign in', { timeout: 2000 }).should('be.visible')

    // Should stay on auth page
    cy.url().should('include', '/auth')
  })

  it('should maintain session after page reload', () => {
    logger.methodEntry('test: should maintain session after reload')
    
    // Create and sign in as test user
    cy.createTestUser(TEST_USER_EMAIL, TEST_USER_PASSWORD, { full_name: TEST_USER_NAME })
    cy.supabaseSignIn(TEST_USER_EMAIL, TEST_USER_PASSWORD)

    // Visit dashboard and wait for initial load
    cy.visit('/dashboard')
    logger.info('Waiting for initial dashboard load')
    cy.contains('Loading...').should('not.exist', { timeout: 10000 })
    
    // Verify we're on the dashboard
    cy.url().should('include', '/dashboard')
    
    // Wait for nav and verify welcome message
    cy.get('nav').should('exist').within(() => {
      logger.info('Checking welcome message in nav')
      cy.contains('AutoCRM').should('be.visible')
      cy.contains(`Welcome, ${TEST_USER_NAME}!`).should('be.visible')
    })

    // Reload page and verify session persists
    logger.info('Reloading page')
    cy.reload()
    cy.contains('Loading...').should('not.exist', { timeout: 10000 })
    
    // Verify we're still on the dashboard
    cy.url().should('include', '/dashboard')
    
    // Wait for nav and verify welcome message still present
    cy.get('nav').should('exist').within(() => {
      logger.info('Checking welcome message after reload')
      cy.contains('AutoCRM').should('be.visible')
      cy.contains(`Welcome, ${TEST_USER_NAME}!`).should('be.visible')
    })

    // Try accessing auth page - should redirect to dashboard
    logger.info('Attempting to access auth page')
    cy.visit('/auth')
    cy.contains('Loading...').should('not.exist', { timeout: 10000 })
    
    // Verify redirect to dashboard
    cy.url().should('include', '/dashboard')
    
    // Wait for nav and verify welcome message still present
    cy.get('nav').should('exist').within(() => {
      logger.info('Checking welcome message after auth page redirect')
      cy.contains('AutoCRM').should('be.visible')
      cy.contains(`Welcome, ${TEST_USER_NAME}!`).should('be.visible')
    })
    
    logger.methodExit('test: should maintain session after reload')
  })

  it('should handle logout correctly', () => {
    logger.methodEntry('test: should handle logout')
    
    // Create and sign in as test user
    cy.createTestUser(TEST_USER_EMAIL, TEST_USER_PASSWORD, { full_name: TEST_USER_NAME })
    cy.supabaseSignIn(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    
    // Visit dashboard and wait for initial load
    cy.visit('/dashboard')
    logger.info('Waiting for initial dashboard load')
    cy.contains('Loading...').should('not.exist', { timeout: 10000 })
    
    // Wait for nav to be visible
    cy.get('nav').should('be.visible', { timeout: 10000 })
    cy.get('nav').within(() => {
      logger.info('Checking welcome message and clicking logout')
      cy.contains(`Welcome, ${TEST_USER_NAME}!`).should('be.visible', { timeout: 10000 })
      cy.contains('Logout').should('be.visible', { timeout: 10000 }).click()
    })

    // Should redirect to auth page
    logger.info('Waiting for redirect to auth page')
    cy.contains('Loading...').should('not.exist', { timeout: 10000 })
    cy.url().should('include', '/auth')

    // Try accessing protected route
    logger.info('Attempting to access dashboard after logout')
    cy.visit('/dashboard')
    cy.contains('Loading...').should('not.exist', { timeout: 10000 })
    cy.url().should('include', '/auth')
    
    logger.methodExit('test: should handle logout')
  })
}) 