describe('Ticket Conversations', () => {
  it('should allow sending and receiving messages', () => {
    cy.task('log', 'Starting ticket conversation test')
    
    // Login as customer
    cy.login('customer@example.com', 'password123')
    cy.visit('/tickets/123')

    // Submit message
    cy.get('textarea').type('Test message from customer')
    cy.get('button[type="submit"]').click()
    
    // Verify message appears
    cy.contains('.message-content', 'Test message from customer')
      .should('be.visible')
    
    // Login as service rep
    cy.login('rep@example.com', 'password123')
    cy.visit('/tickets/123')

    // Submit internal note
    cy.get('textarea').type('Internal service note')
    cy.get('input[type="checkbox"]').check()
    cy.get('button[type="submit"]').click()
    
    // Verify internal tag
    cy.contains('.internal-tag', 'Internal')
      .should('be.visible')
  })
}) 