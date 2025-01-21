/// <reference types="cypress" />
import React from 'react'
import { mount } from 'cypress/react18'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import { BrowserRouter } from 'react-router-dom'

// Wrap component with necessary providers
const Wrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('SignUpForm', () => {
  beforeEach(() => {
    // Reset any previous state
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('should render all form fields', () => {
    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    cy.get('input[id="fullName"]').should('exist')
    cy.get('input[id="email"]').should('exist')
    cy.get('input[id="password"]').should('exist')
    cy.get('input[id="confirmPassword"]').should('exist')
    cy.get('button[type="submit"]').should('exist')
    cy.get('button[type="submit"]').should('contain', 'Create Account')
  })

  it('should validate full name', () => {
    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    // Try submitting with short name
    cy.get('input[id="fullName"]').type('A')
    cy.get('button[type="submit"]').click()

    // Should show validation error
    cy.contains('Full name must be at least 2 characters').should('be.visible')
  })

  it('should validate email format', () => {
    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    // Type invalid email
    cy.get('input[id="email"]').type('invalid-email')
    cy.get('button[type="submit"]').click()

    // Should show validation error
    cy.contains('Invalid email address').should('be.visible')
  })

  it('should validate password requirements', () => {
    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    const testCases = [
      {
        password: 'short',
        error: 'Password must be at least 8 characters'
      },
      {
        password: 'lowercase123!',
        error: 'Password must contain at least one uppercase letter'
      },
      {
        password: 'UPPERCASE123!',
        error: 'Password must contain at least one lowercase letter'
      },
      {
        password: 'NoNumbers!',
        error: 'Password must contain at least one number'
      },
      {
        password: 'NoSpecial123',
        error: 'Password must contain at least one special character'
      }
    ]

    testCases.forEach(({ password, error }) => {
      cy.get('input[id="password"]').clear().type(password)
      cy.get('button[type="submit"]').click()
      cy.contains(error).should('be.visible')
    })
  })

  it('should validate password confirmation', () => {
    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    // Type different passwords
    cy.get('input[id="password"]').type('Password123!')
    cy.get('input[id="confirmPassword"]').type('DifferentPassword123!')
    cy.get('button[type="submit"]').click()

    // Should show validation error
    cy.contains("Passwords don't match").should('be.visible')
  })

  it('should handle successful registration', () => {
    // Mock successful auth response
    cy.stub(window, 'fetch').resolves({
      ok: true,
      json: () => Promise.resolve({
        user: { id: '123', email: 'test@example.com' },
        session: { access_token: 'fake-token' }
      })
    })

    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    // Fill in valid registration data
    cy.get('input[id="fullName"]').type('Test User')
    cy.get('input[id="email"]').type('test@example.com')
    cy.get('input[id="password"]').type('Password123!')
    cy.get('input[id="confirmPassword"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Should show success toast
    cy.contains('Success').should('be.visible')
    cy.contains('Your account has been created').should('be.visible')

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
  })

  it('should handle registration failure', () => {
    // Mock failed auth response
    cy.stub(window, 'fetch').rejects(new Error('Email already exists'))

    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    // Fill in registration data
    cy.get('input[id="fullName"]').type('Test User')
    cy.get('input[id="email"]').type('existing@example.com')
    cy.get('input[id="password"]').type('Password123!')
    cy.get('input[id="confirmPassword"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Should show error toast
    cy.contains('Error').should('be.visible')
    cy.contains('Failed to create account').should('be.visible')
  })

  it('should disable submit button while loading', () => {
    // Mock slow auth response
    cy.stub(window, 'fetch').as('signupRequest')
      .resolves(new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'fake-token' }
        })
      }), 1000)))

    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    // Fill in registration data
    cy.get('input[id="fullName"]').type('Test User')
    cy.get('input[id="email"]').type('test@example.com')
    cy.get('input[id="password"]').type('Password123!')
    cy.get('input[id="confirmPassword"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Button should be disabled and show loading state
    cy.get('button[type="submit"]')
      .should('be.disabled')
      .should('contain', 'Creating Account...')

    // Wait for request to complete
    cy.wait('@signupRequest')

    // Button should be enabled again
    cy.get('button[type="submit"]')
      .should('not.be.disabled')
      .should('contain', 'Create Account')
  })

  it('should prevent duplicate email registration', () => {
    // Mock auth response for duplicate email
    cy.stub(window, 'fetch').rejects({
      error_description: 'User already registered'
    })

    mount(
      <Wrapper>
        <SignUpForm />
      </Wrapper>
    )

    // Try registering with existing demo account email
    cy.get('input[id="fullName"]').type('New Customer')
    cy.get('input[id="email"]').type('customer@example.com')
    cy.get('input[id="password"]').type('Password123!')
    cy.get('input[id="confirmPassword"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Should show error toast
    cy.contains('Error').should('be.visible')
    cy.contains('Failed to create account').should('be.visible')
  })
}) 