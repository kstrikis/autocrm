describe('Customer Access', () => {
  const TEST_CUSTOMER_EMAIL = 'test-customer@example.com'
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'

  beforeEach(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting test setup')
    
    // Clean up any existing test data
    cy.cleanupTestTickets()
    cy.cleanupTestUser(TEST_CUSTOMER_EMAIL)

    // Create test customer and tickets
    cy.logStep('Creating test customer')
    cy.createAdminManagedUser(TEST_CUSTOMER_EMAIL, {
      fullName: 'Test Customer',
      role: 'customer',
      password: TEST_PASSWORD
    }).then((user) => {
      cy.logStep('Creating test tickets')
      cy.seedTestTickets([
        {
          title: 'Open Ticket 1',
          description: 'This is an open ticket',
          priority: 'high',
          status: 'new',
          customerId: user.id
        },
        {
          title: 'Resolved Ticket 1',
          description: 'This is a resolved ticket',
          priority: 'medium',
          status: 'resolved',
          customerId: user.id
        },
        {
          title: 'Resolved Ticket 2',
          description: 'This is another resolved ticket',
          priority: 'low',
          status: 'resolved',
          customerId: user.id
        }
      ])
    })

    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  })

  afterEach(() => {
    cy.startLifecycleSegment('Test Cleanup', false)
    cy.pushToLog('Starting cleanup')
    cy.cleanupTestTickets()
    cy.cleanupTestUser(TEST_CUSTOMER_EMAIL)
    cy.pushToLog('Cleanup complete')
    cy.flushLogBuffer()
  })

  it('customer should see correct metrics and limited access', () => {
    cy.startSegment('Customer Access Verification')
    
    // Sign in as customer
    cy.logStep('Logging in as customer')
    cy.supabaseSignIn(TEST_CUSTOMER_EMAIL, { password: TEST_PASSWORD })
    cy.visit('/dashboard')

    // Wait for navigation and verify we're logged in
    cy.logStep('Verifying successful login')
    cy.url().should('include', '/dashboard')

    // Verify metrics are displayed correctly
    cy.logStep('Verifying metrics display')
    cy.contains('Open Tickets').should('be.visible')
    cy.contains('Resolved Tickets').should('be.visible')
    cy.contains('Average Response Time').should('not.exist')
    cy.contains('Active Customers').should('not.exist')

    // Verify metrics values
    cy.logStep('Checking metrics values')
    cy.get('[data-testid="metrics-grid"]').within(() => {
      // Should show 1 open ticket
      cy.get('[data-testid="metric-open-tickets"]').within(() => {
        cy.contains('1').should('be.visible')
        cy.contains('1 high priority').should('be.visible')
      })

      // Should show 2 resolved tickets
      cy.get('[data-testid="metric-resolved-tickets"]').within(() => {
        cy.contains('2').should('be.visible')
      })
    })

    // Click the Tickets link in sidebar
    cy.logStep('Checking ticket list')
    cy.contains('My Tickets').click()

    // Verify only customer's tickets are visible
    cy.get('[data-testid="ticket-list"]')
      .find('[data-testid="ticket-item"]')
      .should('have.length', 3)

    // Verify Users link is not visible
    cy.logStep('Verifying access restrictions')
    cy.contains('Users').should('not.exist')
    
    cy.logStep('Test complete', { complete: true })
  })
}) 