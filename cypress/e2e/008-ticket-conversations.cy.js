describe('Ticket Conversations', () => {
  const CUSTOMER_EMAIL = 'customer@example.com'
  const SERVICE_REP_EMAIL = 'rep@example.com'
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'
  
  beforeEach(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting test setup')
    
    // Clean up in correct order - messages first, then tickets, then users
    cy.task('log', { message: 'Starting thorough cleanup' })
    cy.cleanupTestTickets() // This will cascade delete ticket messages
      .then(() => cy.cleanupTestUser(CUSTOMER_EMAIL))
      .then(() => cy.cleanupTestUser(SERVICE_REP_EMAIL))
      .then(() => {
        // Create test users in sequence
        cy.createAdminManagedUser(CUSTOMER_EMAIL, { role: 'customer', password: TEST_PASSWORD })
          .then((customerUser) => {
            cy.createAdminManagedUser(SERVICE_REP_EMAIL, { role: 'service_rep', password: TEST_PASSWORD })
              .then((repUser) => {
                // Create test ticket with proper customer ID
                cy.seedTestTickets([{
                  title: 'Test Ticket',
                  description: 'Test ticket for conversation',
                  customerId: customerUser.id,
                  assignedTo: repUser.id,
                  status: 'open',
                  priority: 'medium'
                }])
              })
          })
      })
    
    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  })

  afterEach(() => {
    cy.startLifecycleSegment('Test Cleanup', false)
    cy.pushToLog('Starting cleanup')
    
    // Clean up in correct order
    cy.cleanupTestTickets() // This will cascade delete ticket messages
      .then(() => cy.cleanupTestUser(CUSTOMER_EMAIL))
      .then(() => cy.cleanupTestUser(SERVICE_REP_EMAIL))
    
    cy.pushToLog('Cleanup complete')
    cy.flushLogBuffer()
  })

  it('should allow sending and receiving messages', () => {
    cy.startSegment('Ticket Conversation Flow')
    
    // Login as customer
    cy.logStep('Logging in as customer')
    cy.supabaseSignIn(CUSTOMER_EMAIL, { password: TEST_PASSWORD })
    cy.visit('/tickets')
    
    // Find and open ticket
    cy.logStep('Opening test ticket')
    cy.contains('Test Ticket').click()
    
    // Submit message
    cy.logStep('Submitting customer message')
    cy.get('textarea').type('Test message from customer')
    cy.get('button[type="submit"]').click()
    
    // Verify message appears
    cy.logStep('Verifying customer message')
    cy.contains('p', 'Test message from customer', { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
    
    // Logout customer
    cy.logStep('Logging out customer')
    cy.supabaseSignOut()
    
    // Login as service rep
    cy.logStep('Logging in as service rep')
    cy.supabaseSignIn(SERVICE_REP_EMAIL, { password: TEST_PASSWORD })
    cy.visit('/tickets')
    
    // Find and open ticket
    cy.logStep('Opening test ticket as service rep')
    cy.contains('Test Ticket').click()
    
    // Submit internal note
    cy.logStep('Submitting internal note')
    cy.get('textarea').type('Internal service note')
    cy.get('input[type="checkbox"]').check()
    cy.get('button[type="submit"]').click()
    
    // Wait for message to be processed and verify
    cy.logStep('Waiting for message to be processed')
    cy.wait(1000) // Give more time for processing
    cy.reload()
    
    // Wait for page to stabilize after reload
    cy.get('.message-list', { timeout: 2000 }).should('exist')
    
    // Verify internal note appears
    cy.logStep('Verifying internal note content')
    cy.contains('.message', 'Internal service note', { timeout: 15000 })
      .should('exist')
      .scrollIntoView({ offset: { top: -100, left: 0 } })
      .within(() => {
        // Verify the message content
        cy.get('p')
          .contains('Internal service note')
          .should('be.visible')
        
        // Verify the internal note badge
        cy.logStep('Verifying internal note badge')
        cy.contains('div', 'Internal Note')
          .should('be.visible')
          .and('have.class', 'bg-yellow-100')
      })
      
    // Double check visibility after all operations
    cy.contains('.message', 'Internal service note')
      .should('be.visible')
      .find('div')
      .contains('Internal Note')
      .should('be.visible')
      
    cy.logStep('Test complete', { complete: true })
  })
}) 