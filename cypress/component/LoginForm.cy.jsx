/// <reference types="cypress" />
import React from 'react'
import { mount } from 'cypress/react18'
import { LoginForm } from '@/components/auth/LoginForm'
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

describe('LoginForm', () => {
  beforeEach(() => {
    // Reset any previous state
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('should render all form fields', () => {
    mount(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
    cy.get('button[type="submit"]').should('exist')
    cy.get('button[type="submit"]').should('contain', 'Sign In')
  })

  it('should validate email format', () => {
    mount(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    // Type invalid email
    cy.get('input[type="email"]').type('invalid-email')
    cy.get('input[type="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Should show validation error
    cy.contains('Invalid email address').should('be.visible')
  })

  it('should validate password length', () => {
    mount(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    // Type short password
    cy.get('input[type="email"]').type('test@example.com')
    cy.get('input[type="password"]').type('short')
    cy.get('button[type="submit"]').click()

    // Should show validation error
    cy.contains('Password must be at least 6 characters').should('be.visible')
  })

  it('should handle successful login', () => {
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
        <LoginForm />
      </Wrapper>
    )

    // Fill in valid credentials
    cy.get('input[type="email"]').type('test@example.com')
    cy.get('input[type="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Should show success toast
    cy.contains('Success').should('be.visible')
    cy.contains('You have been logged in successfully').should('be.visible')

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
  })

  it('should handle login failure', () => {
    // Mock failed auth response
    cy.stub(window, 'fetch').rejects(new Error('Invalid credentials'))

    mount(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    // Fill in credentials
    cy.get('input[type="email"]').type('test@example.com')
    cy.get('input[type="password"]').type('WrongPassword123!')
    cy.get('button[type="submit"]').click()

    // Should show error toast
    cy.contains('Error').should('be.visible')
    cy.contains('Failed to sign in').should('be.visible')
  })

  it('should disable submit button while loading', () => {
    // Mock slow auth response
    cy.stub(window, 'fetch').as('loginRequest')
      .resolves(new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'fake-token' }
        })
      }), 1000)))

    mount(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    // Fill in credentials and submit
    cy.get('input[type="email"]').type('test@example.com')
    cy.get('input[type="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Button should be disabled and show loading state
    cy.get('button[type="submit"]')
      .should('be.disabled')
      .should('contain', 'Signing in...')

    // Wait for request to complete
    cy.wait('@loginRequest')

    // Button should be enabled again
    cy.get('button[type="submit"]')
      .should('not.be.disabled')
      .should('contain', 'Sign In')
  })

  it('should handle demo customer login', () => {
    mount(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    // Fill in demo customer credentials
    cy.get('input[type="email"]').type('customer@example.com')
    cy.get('input[type="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Should show success toast
    cy.contains('Success').should('be.visible')
    cy.contains('You have been logged in successfully').should('be.visible')

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
  })

  it('should handle demo service rep login', () => {
    mount(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    // Fill in demo service rep credentials
    cy.get('input[type="email"]').type('service@example.com')
    cy.get('input[type="password"]').type('Password123!')
    cy.get('button[type="submit"]').click()

    // Should show success toast
    cy.contains('Success').should('be.visible')
    cy.contains('You have been logged in successfully').should('be.visible')

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
  })
}) 