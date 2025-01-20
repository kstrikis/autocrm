/// <reference types="cypress" />

describe('App', () => {
  it('should load the landing page', () => {
    cy.visit('/')
    cy.contains('Welcome to AutoCRM')
  })
})