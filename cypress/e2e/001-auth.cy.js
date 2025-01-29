/// <reference types="cypress" />

describe('Authentication Flow', () => {
  const TEST_USER_EMAIL = 'test@example.com'
  const TEST_USER_PASSWORD = 'StrongP@ssw0rd123!'
  const TEST_USER_NAME = 'Test User'

  beforeEach(() => {
    cy.startLifecycleSegment('Auth Test Setup', true)
    cy.pushToLog('Starting authentication test setup')
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/')
    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  })

  afterEach(() => {
    cy.startLifecycleSegment('Auth Test Cleanup', false)
    cy.pushToLog('Starting authentication test cleanup')
    cy.cleanupTestUser(TEST_USER_EMAIL)
    cy.pushToLog('Test cleanup complete')
    cy.flushLogBuffer()
  })

  it('should show welcome message and auth options', () => {
    cy.startSegment('Welcome Page Verification')
    cy.logStep('Checking welcome message presence')
    cy.contains('Welcome to AutoCRM').should('be.visible')
    
    cy.logStep('Verifying auth options layout')
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Login').should('be.visible')
      cy.contains('Sign Up').should('be.visible')
    })

    cy.logStep('Checking demo account section')
    cy.contains('Try our demo accounts:').should('be.visible')
    cy.contains('Demo Customer').should('be.visible')
    cy.contains('Demo Service Rep').should('be.visible')
    cy.contains('Demo Admin').should('be.visible')
    
    cy.logStep('Welcome page verification complete', { complete: true })
  })

  it('should validate login form fields', () => {
    cy.startSegment('Login Form Validation')
    
    cy.logStep('Testing empty form submission')
    cy.get('button').contains('Sign In').click()
    
    cy.logStep('Verifying validation errors')
    cy.contains('Invalid email address').should('be.visible')
    cy.contains('Password must be at least 6 characters').should('be.visible')

    cy.logStep('Testing invalid email format')
    cy.get('input[type="email"]').type('invalid-email')
    cy.get('button').contains('Sign In').click()
    cy.contains('Invalid email address').should('be.visible')
    
    cy.logStep('Login validation tests complete', { complete: true })
  })

  it('should validate signup form fields', () => {
    cy.startSegment('Signup Form Validation')
    
    cy.logStep('Switching to signup tab')
    cy.contains('Sign Up').click()

    cy.logStep('Testing empty form submission')
    cy.get('button').contains('Create Account').click()
    
    cy.logStep('Checking initial validation errors')
    cy.contains('Full name must be at least 2 characters').should('be.visible')
    cy.contains('Invalid email address').should('be.visible')

    cy.logStep('Testing weak password validation')
    cy.get('input[name="fullName"]').type(TEST_USER_NAME)
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type('weak')
    cy.get('input[name="confirmPassword"]').type('weak')
    cy.get('button').contains('Create Account').click()
    cy.contains('Password strength: Weak').should('be.visible')

    cy.logStep('Testing password mismatch')
    cy.get('input[name="password"]').clear().type(TEST_USER_PASSWORD)
    cy.get('input[name="confirmPassword"]').clear().type('DifferentP@ssw0rd123!')
    cy.get('button').contains('Create Account').click()
    cy.contains("Passwords don't match").should('be.visible')
    
    cy.logStep('Signup validation tests complete', { complete: true })
  })

  it('should handle successful signup and login', () => {
    cy.startSegment('Full Registration Flow')
    
    cy.logStep('Initiating signup process')
    cy.contains('Sign Up').click()

    cy.logStep('Filling registration form')
    cy.get('input[name="fullName"]').type(TEST_USER_NAME)
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type(TEST_USER_PASSWORD)
    cy.get('input[name="confirmPassword"]').type(TEST_USER_PASSWORD)
    
    cy.logStep('Submitting registration')
    cy.get('button').contains('Create Account').click()

    cy.logStep('Verifying successful registration')
    cy.contains('Success').should('be.visible')
    cy.url().should('include', '/dashboard')

    cy.logStep('Initiating logout')
    cy.contains('Logout').click()

    cy.logStep('Attempting login with new credentials')
    cy.visit('/auth')
    cy.get('input[name="email"]').type(TEST_USER_EMAIL)
    cy.get('input[name="password"]').type(TEST_USER_PASSWORD)
    cy.get('button').contains('Sign In').click()

    cy.logStep('Verifying successful login')
    cy.url().should('include', '/dashboard')
    
    cy.logStep('Registration flow complete', { complete: true })
  })

  it('should handle demo account login', () => {
    cy.startSegment('Demo Account Validation')
    
    cy.logStep('Testing demo customer login')
    cy.contains('Demo Customer').click()
    cy.url().should('include', '/dashboard')
    cy.contains('Logout').click()

    cy.logStep('Testing demo service rep login')
    cy.visit('/auth')
    cy.contains('Demo Service Rep').click()
    cy.url().should('include', '/dashboard')
    
    cy.logStep('Demo account tests complete', { complete: true })
  })

  it('should handle invalid login attempts', () => {
    cy.startSegment('Invalid Login Handling')
    
    cy.logStep('Attempting invalid login')
    cy.get('input[type="email"]').type('invalid@example.com')
    cy.get('input[type="password"]').type('WrongPassword123!')
    cy.get('button').contains('Sign In').click()

    cy.logStep('Verifying error display')
    cy.contains('Error', { timeout: 2000 }).should('be.visible')
    cy.contains('Failed to sign in', { timeout: 2000 }).should('be.visible')
    cy.url().should('include', '/auth')
    
    cy.logStep('Invalid login tests complete', { complete: true })
  })
})