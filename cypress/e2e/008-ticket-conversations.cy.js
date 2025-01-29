describe('Ticket Conversations', () => {
  const CUSTOMER_EMAIL = 'customer@example.com'
  const SERVICE_REP_EMAIL = 'rep@example.com'
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'
  
  beforeEach(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting test setup')
    cy.cleanupTestUser(CUSTOMER_EMAIL)
    cy.cleanupTestUser(SERVICE_REP_EMAIL)
    cy.cleanupTestTickets()
    
    // Create test users
    cy.createAdminManagedUser(CUSTOMER_EMAIL, { role: 'customer', password: TEST_PASSWORD })
    cy.createAdminManagedUser(SERVICE_REP_EMAIL, { role: 'service-rep', password: TEST_PASSWORD })
    
    // Create test ticket
    cy.seedTestTickets([{
      title: 'Test Ticket',
      description: 'Test ticket for conversation',
      customer_id: CUSTOMER_EMAIL,
      status: 'open',
      priority: 'medium'
    }])
    
    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  })

  afterEach(() => {
    cy.startLifecycleSegment('Test Cleanup', false)
    cy.pushToLog('Starting cleanup')
    cy.cleanupTestUser(CUSTOMER_EMAIL)
    cy.cleanupTestUser(SERVICE_REP_EMAIL)
    cy.cleanupTestTickets()
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
    cy.contains('.message-content', 'Test message from customer')
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
    
    // Verify internal tag
    cy.logStep('Verifying internal note')
    cy.contains('.internal-tag', 'Internal')
      .should('be.visible')
      
    cy.logStep('Test complete', { complete: true })
  })
}) 