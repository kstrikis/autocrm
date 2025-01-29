describe('Service Rep Access', () => {
  const TEST_CUSTOMER1_EMAIL = 'test-customer1@example.com'
  const TEST_CUSTOMER2_EMAIL = 'test-customer2@example.com'
  const TEST_SERVICE_REP_EMAIL = 'test-service-rep@example.com'
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'

  beforeEach(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting test setup')
    
    // Clean up any existing test data
    cy.cleanupTestTickets()
    cy.cleanupTestUser(TEST_CUSTOMER1_EMAIL)
    cy.cleanupTestUser(TEST_CUSTOMER2_EMAIL)
    cy.cleanupTestUser(TEST_SERVICE_REP_EMAIL)

    // Create service rep user
    cy.logStep('Creating service rep user')
    cy.createAdminManagedUser(TEST_SERVICE_REP_EMAIL, {
      fullName: 'Test Service Rep',
      role: 'service_rep',
      password: TEST_PASSWORD
    })

    // Create test customers and tickets
    cy.logStep('Creating first test customer')
    cy.createAdminManagedUser(TEST_CUSTOMER1_EMAIL, {
      fullName: 'Test Customer 1',
      role: 'customer',
      password: TEST_PASSWORD
    }).then((user) => {
      cy.logStep('Creating tickets for first customer')
      cy.seedTestTickets([
        {
          title: 'Test Ticket 1',
          description: 'This is test ticket 1',
          priority: 'high',
          status: 'new',
          customerId: user.id
        },
        {
          title: 'Test Ticket 2',
          description: 'This is test ticket 2',
          priority: 'medium',
          status: 'open',
          customerId: user.id
        }
      ])
    })

    cy.logStep('Creating second test customer')
    cy.createAdminManagedUser(TEST_CUSTOMER2_EMAIL, {
      fullName: 'Test Customer 2',
      role: 'customer',
      password: TEST_PASSWORD
    }).then((user) => {
      cy.logStep('Creating tickets for second customer')
      cy.seedTestTickets([
        {
          title: 'Test Ticket 3',
          description: 'This is test ticket 3',
          priority: 'urgent',
          status: 'pending_customer',
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
    cy.cleanupTestUser(TEST_CUSTOMER1_EMAIL)
    cy.cleanupTestUser(TEST_CUSTOMER2_EMAIL)
    cy.cleanupTestUser(TEST_SERVICE_REP_EMAIL)
    cy.pushToLog('Cleanup complete')
    cy.flushLogBuffer()
  })

  it('service rep should see correct metrics and access', () => {
    cy.startSegment('Service Rep Access Verification')
    
    // Sign in as service rep
    cy.logStep('Logging in as service rep')
    cy.supabaseSignIn(TEST_SERVICE_REP_EMAIL, { password: TEST_PASSWORD })
    cy.visit('/dashboard')

    // Wait for navigation and verify we're logged in
    cy.logStep('Verifying successful login')
    cy.url().should('include', '/dashboard')

    // Verify metrics are displayed correctly
    cy.logStep('Verifying metrics display')
    cy.contains('Open Tickets').should('be.visible')
    cy.contains('Average Response Time').should('be.visible')
    cy.contains('Resolved Tickets').should('be.visible')

    // Verify metrics values
    cy.logStep('Checking metrics values')
    cy.get('[data-testid="metrics-grid"]').within(() => {
      // Should show 3 open tickets (2 from customer1, 1 from customer2)
      cy.contains('3').should('be.visible')
      // Should show 2 high priority tickets (1 high, 1 urgent)
      cy.contains('2 high priority').should('be.visible')
    })

    // Click the Tickets link in sidebar
    cy.logStep('Checking ticket list')
    cy.contains('All Tickets').click()

    // Verify all seeded tickets are visible
    cy.get('[data-testid="ticket-list"]')
      .find('[data-testid="ticket-item"]')
      .should('have.length', 3)
    
    // Click the Users link in sidebar and verify seeded users
    cy.logStep('Checking user list')
    cy.contains('Users').click()
    
    // Verify our test users are visible (don't care about total count)
    cy.get('[data-testid="user-list"]')
      .find('[data-testid="user-item"]')
      .should('have.length.at.least', 3) // At minimum we should see our test users
      .then(() => {
        // Verify we can see our test users
        cy.contains(TEST_CUSTOMER1_EMAIL).should('be.visible')
        cy.contains(TEST_CUSTOMER2_EMAIL).should('be.visible')
        cy.contains(TEST_SERVICE_REP_EMAIL).should('be.visible')
      })
      
    cy.logStep('Test complete', { complete: true })
  })
})