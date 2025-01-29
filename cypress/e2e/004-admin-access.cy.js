describe('Admin Access', () => {
  const TEST_CUSTOMER1_EMAIL = 'test-customer1@example.com'
  const TEST_CUSTOMER2_EMAIL = 'test-customer2@example.com'
  const TEST_ADMIN_EMAIL = 'test-admin@example.com'
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'

  beforeEach(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting test setup')
    
    // Clean up any existing test data
    cy.cleanupTestTickets()
    cy.cleanupTestUser(TEST_CUSTOMER1_EMAIL)
    cy.cleanupTestUser(TEST_CUSTOMER2_EMAIL)
    cy.cleanupTestUser(TEST_ADMIN_EMAIL)

    // Create admin user
    cy.logStep('Creating admin user')
    cy.createAdminManagedUser(TEST_ADMIN_EMAIL, {
      fullName: 'Test Admin',
      role: 'admin',
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

    // Create a customer from last week
    cy.logStep('Creating second test customer')
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    cy.createAdminManagedUser(TEST_CUSTOMER2_EMAIL, {
      fullName: 'Test Customer 2',
      role: 'customer',
      password: TEST_PASSWORD,
      created_at: lastWeek.toISOString()
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
    cy.cleanupTestUser(TEST_ADMIN_EMAIL)
    cy.pushToLog('Cleanup complete')
    cy.flushLogBuffer()
  })

  it('admin should see correct metrics and full access', () => {
    cy.startSegment('Admin Access Verification')
    
    // Sign in as admin
    cy.logStep('Logging in as admin')
    cy.supabaseSignIn(TEST_ADMIN_EMAIL, { password: TEST_PASSWORD })
    cy.visit('/dashboard')

    // Wait for navigation and verify we're logged in
    cy.logStep('Verifying successful login')
    cy.url().should('include', '/dashboard')

    // Verify metrics are displayed correctly
    cy.logStep('Verifying metrics display')
    cy.contains('Open Tickets').should('be.visible')
    cy.contains('Average Response Time').should('be.visible')
    cy.contains('Active Customers').should('be.visible')
    cy.contains('Resolved Tickets').should('not.exist')

    // Verify metrics values
    cy.logStep('Checking metrics values')
    cy.get('[data-testid="metrics-grid"]').within(() => {
      // Verify open tickets metric is present and has some value
      cy.get('[data-testid="metric-open-tickets"]')
        .should('be.visible')
        .within(() => {
          // Should have some numeric value
          cy.get('div').contains(/^[0-9]+$/).should('be.visible')
          // Should mention high priority tickets
          cy.contains(/high priority/i).should('be.visible')
        })

      // Verify response time metric is present
      cy.get('[data-testid="metric-response-time"]')
        .should('be.visible')

      // Verify active customers metric is present and has some value
      cy.get('[data-testid="metric-active-customers"]')
        .should('be.visible')
        .within(() => {
          // Should have some numeric value
          cy.get('div').contains(/^[0-9]+$/).should('be.visible')
          // Should mention new customers
          cy.contains(/new/i).should('be.visible')
        })
    })

    // Verify admin dashboard is visible
    cy.logStep('Verifying admin dashboard sections')
    cy.contains('Team Management').should('be.visible')
    cy.contains('Routing Rules').should('be.visible')
    cy.contains('Performance').should('be.visible')

    // Click the Tickets link in sidebar
    cy.logStep('Checking ticket list')
    cy.contains('All Tickets').click()

    // Verify all tickets are visible
    cy.get('[data-testid="ticket-list"]')
      .find('[data-testid="ticket-item"]')
      .should('have.length', 3)
    
    // Click the Users link in sidebar
    cy.logStep('Checking user list')
    cy.contains('Users').click()
    
    // Verify our test users are visible (don't care about total count)
    cy.get('[data-testid="user-list"]')
      .should('be.visible')
      .within(() => {
        // Verify we can see our test users
        cy.contains(TEST_CUSTOMER1_EMAIL).should('be.visible')
        cy.contains(TEST_CUSTOMER2_EMAIL).should('be.visible')
        cy.contains(TEST_ADMIN_EMAIL).should('be.visible')
      })
      
    cy.logStep('Test complete', { complete: true })
  })
}) 