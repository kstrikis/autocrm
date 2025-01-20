/// <reference types="cypress" />

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('Messaging', () => {
  beforeEach(() => {
    // Set up API intercepts
    cy.intercept('GET', `${SUPABASE_URL}/rest/v1/users*`, (req) => {
      console.log('Intercepted user lookup request:', req)
      req.continue()
    }).as('findUser')

    cy.intercept('POST', `${SUPABASE_URL}/rest/v1/users*`, (req) => {
      console.log('Intercepted user creation request:', req)
      req.continue()
    }).as('createUser')

    cy.intercept('POST', `${SUPABASE_URL}/rest/v1/channel_members*`, (req) => {
      console.log('Intercepted channel member creation request:', req)
      req.continue()
    }).as('joinChannel')

    cy.intercept('POST', `${SUPABASE_URL}/rest/v1/messages*`, (req) => {
      console.log('Intercepted message request:', req)
      req.continue()
    }).as('createMessage')

    // Visit the app and log in as a guest
    cy.visit('/')
    cy.get('input[placeholder="Enter a guest name (optional)"]').type('Test User')
    cy.get('button').contains('Join as Guest').click()

    // Wait for user creation flow to complete
    cy.wait('@findUser', { timeout: 10000 })
    cy.wait('@createUser', { timeout: 10000 })
    cy.wait('@joinChannel', { timeout: 10000 })
    cy.url().should('include', '/chat')
  })

  it('should send and receive messages in real-time', () => {
    // Create a new channel
    cy.get('button').contains('Create Channel').click()
    cy.get('input[placeholder="Channel name"]').type('test-channel')
    cy.get('button').contains('Create').click()

    // Wait for channel to be created and selected
    cy.contains('test-channel').should('be.visible')

    // Send a message
    const messageText = 'Hello, this is a test message!'
    cy.get('textarea[placeholder="Message #test-channel"]').type(messageText)
    cy.get('textarea[placeholder="Message #test-channel"]').type('{enter}')

    // Wait for message to be sent
    cy.wait('@createMessage')

    // Verify message appears in the chat
    cy.contains(messageText).should('be.visible')

    // Open a new window to test real-time updates
    cy.window().then((win: Window) => {
      const newWindow = win.open('/', '_blank')
      if (newWindow) {
        cy.wrap(newWindow).as('newWindow')
      }
    })

    cy.get('@newWindow').within(() => {
      // Log in as a different guest
      cy.get('input[placeholder="Enter a guest name (optional)"]').type('Second Test User')
      cy.get('button').contains('Join as Guest').click()

      // Wait for login to complete
      cy.wait('@createUser')

      // Join the test channel
      cy.contains('test-channel').click()

      // Verify the previous message is visible
      cy.contains(messageText).should('be.visible')

      // Send a new message
      const secondMessage = 'This is a reply!'
      cy.get('textarea[placeholder="Message #test-channel"]').type(secondMessage)
      cy.get('textarea[placeholder="Message #test-channel"]').type('{enter}')

      // Wait for message to be sent
      cy.wait('@createMessage')

      // Verify new message appears
      cy.contains(secondMessage).should('be.visible')
    })

    // Verify the second message appears in the original window
    cy.contains('This is a reply!').should('be.visible')
  })

  it('should handle message formatting', () => {
    // Create and join a channel
    cy.get('button').contains('Create Channel').click()
    cy.get('input[placeholder="Channel name"]').type('format-test')
    cy.get('button').contains('Create').click()

    // Test bold formatting
    cy.get('textarea[placeholder="Message #format-test"]').type('This is **bold** text')
    cy.get('textarea[placeholder="Message #format-test"]').type('{enter}')

    // Wait for message to be sent
    cy.wait('@createMessage')
    cy.get('.message-content strong').should('contain', 'bold')

    // Test italic formatting
    cy.get('textarea[placeholder="Message #format-test"]').type('This is *italic* text')
    cy.get('textarea[placeholder="Message #format-test"]').type('{enter}')
    cy.wait('@createMessage')
    cy.get('.message-content em').should('contain', 'italic')

    // Test link formatting
    cy.get('textarea[placeholder="Message #format-test"]').type('Here is a [link](https://example.com)')
    cy.get('textarea[placeholder="Message #format-test"]').type('{enter}')
    cy.wait('@createMessage')
    cy.get('.message-content a').should('have.attr', 'href', 'https://example.com')
  })

  it('should persist messages after logout and login', () => {
    // Send a message
    cy.get('[data-cy="message-input"]').type('Hello, this is a test message{enter}')
    cy.contains('Hello, this is a test message').should('be.visible')

    // Logout
    cy.get('[data-cy="logout-button"]').click()
    cy.url().should('eq', 'http://localhost:5173/')
    cy.get('[data-cy="guest-name-input"]').should('be.visible')

    // Verify localStorage is cleared
    cy.window().its('localStorage').should('have.length', 0)

    // Login again
    cy.get('[data-cy="guest-name-input"]').type('TestUser{enter}')
    cy.url().should('include', '/chat')

    // Verify message persists
    cy.contains('Hello, this is a test message').should('be.visible')
  })
}) 