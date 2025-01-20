/// <reference types="cypress" />
import { mount } from 'cypress/react18'
import './commands'

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
      stub(): Chainable<any>
      get(alias: string): Chainable<any>
    }
  }
}

Cypress.Commands.add('mount', mount) 