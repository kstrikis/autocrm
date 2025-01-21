/// <reference types="cypress" />
import React from 'react'
import { mount } from 'cypress/react18'
import { UserForm } from '@/components/UserForm'

describe('UserForm', () => {
  beforeEach(() => {
    // Mock the createUser function
    cy.window().then((win) => {
      win.createUser = cy.stub().as('createUser')
    })
  })

  it('should render the form', () => {
    mount(<UserForm onSubmit={() => {}} submitText="Sign In" />)
    cy.get('form').should('exist')
    cy.get('input[id="name"]').should('exist')
    cy.get('input[id="email"]').should('exist')
    cy.get('button[type="submit"]').should('exist')
  })

  it('should handle form submission', () => {
    const onSubmit = cy.stub().as('onSubmit')
    mount(<UserForm onSubmit={onSubmit} submitText="Sign In" />)

    const email = 'test@example.com'
    const password = 'password123'

    cy.get('input[type="email"]').type(email)
    cy.get('input[type="password"]').type(password)
    cy.get('button[type="submit"]').click()

    cy.get('@onSubmit').should('have.been.calledWith', {
      email,
      password
    })
  })

  it('should show validation errors', () => {
    const onSubmit = cy.stub().as('onSubmit')
    mount(<UserForm onSubmit={onSubmit} submitText="Sign In" />)

    // Try submitting with invalid email
    cy.get('input[type="email"]').type('invalid-email')
    cy.get('input[type="password"]').type('short')
    cy.get('button[type="submit"]').click()

    // Should show validation errors
    cy.contains('Invalid email').should('be.visible')
    cy.contains('String must contain at least 8 character(s)').should('be.visible')
    cy.get('@onSubmit').should('not.have.been.called')
  })

  it('should handle errors', () => {
    // Mock error response
    cy.window().then((win) => {
      win.createUser = cy.stub().as('createUser').rejects(new Error('Failed to create user'))
    })
    
    mount(<UserForm onSubmit={() => {}} submitText="Sign In" />)
    
    const name = 'Test User'
    const email = 'test@example.com'

    cy.get('input[id="name"]').type(name)
    cy.get('input[id="email"]').type(email)
    cy.get('button[type="submit"]').click()

    cy.get('.error').should('be.visible')
    cy.get('.error').should('contain', 'Failed to create user')
  })
}) 