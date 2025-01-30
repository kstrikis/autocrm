import { supabase, supabaseAdmin } from '../support/supabase.js'

describe('Process AI Action', () => {
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'
  let testCustomer;
  let testServiceRep;
  let testTicket;

  before(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting AI process test setup')
    
    // Clean up any existing test data first
    cy.task('log', { message: 'Starting thorough cleanup before test' })
    cy.cleanupTestTickets()
      .then(() => {
        cy.pushToLog('Creating test customer')
        return cy.createAdminManagedUser('customer@example.com', { 
          role: 'customer', 
          password: TEST_PASSWORD,
          fullName: 'Test Customer'
        })
      })
      .then((customer) => {
        testCustomer = customer
        cy.pushToLog(`Created test customer: ${customer.email}`)
        
        cy.pushToLog('Creating test service rep')
        return cy.createAdminManagedUser('rep@example.com', { 
          role: 'service_rep', 
          password: TEST_PASSWORD,
          fullName: 'Test Service Rep'
        })
      })
      .then((rep) => {
        testServiceRep = rep
        cy.pushToLog(`Created test service rep: ${rep.email}`)
        
        // Create test ticket for customer
        cy.pushToLog('Creating test ticket')
        cy.seedTestTickets([{
          title: 'Test Ticket for AI Process',
          description: 'This is a test ticket for testing the AI process function',
          customerId: testCustomer.id,
          status: 'new',
          priority: 'medium'
        }])
        
        // Query for the created ticket
        return cy.wrap(
          supabaseAdmin
            .from('tickets')
            .select('*')
            .eq('title', 'Test Ticket for AI Process')
            .single()
        )
      })
      .then(({ data, error }) => {
        if (error) throw error
        testTicket = data
        cy.pushToLog(`Created test ticket: ${testTicket.id}`)
      })

    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  });

  beforeEach(() => {
    cy.startSegment('Test Preparation')
    cy.logStep('Logging in as service rep')
    
    // Login as service rep before each test
    cy.supabaseSignIn(testServiceRep.email, { password: TEST_PASSWORD })
    cy.visit('/dashboard')
    
    cy.logStep('Service rep login complete')
  });

  it('should process AI input for adding a note', () => {
    cy.startSegment('AI Process Test')
    cy.logStep('Starting AI process test')
    
    // Make sure we're on the dashboard
    cy.logStep('Ensuring we are on dashboard')
    cy.url().should('include', '/dashboard')
    
    // Type test message into AI input with detailed logging
    cy.logStep('Locating AI input field')
    cy.get('textarea').first()
      .should('be.visible')
      .should('not.be.disabled')
      .then(() => {
        cy.logStep('Found AI input field')
        cy.logStep('Typing test message')
        return cy.get('textarea').first()
          .clear()
          .type(`Add a note for ${testCustomer.full_name} about hydraulic seal replacement`)
      })
    
    // Click process button with logging
    cy.logStep('Submitting AI input')
    cy.contains('button', 'Process').click()
      .then(() => {
        cy.logStep('Input submitted')
      })
    
    // Verify success toast with detailed logging
    cy.logStep('Waiting for success toast')
    cy.get('[role="status"]')
      .should('be.visible')
      .should('not.contain', 'Error')
      .then(() => {
        cy.logStep('Success toast appeared')
      })
    
    cy.logStep('AI process test complete', { complete: true })
  });

  after(() => {
    cy.startLifecycleSegment('Test Cleanup', false)
    cy.pushToLog('Starting test cleanup')
    
    // Cleanup test data in correct order
    cy.cleanupTestTickets()
      .then(() => {
        cy.pushToLog('Test tickets cleaned up')
        return cy.cleanupTestUser(testCustomer.email)
      })
      .then(() => {
        cy.pushToLog('Test customer cleaned up')
        return cy.cleanupTestUser(testServiceRep.email)
      })
      .then(() => {
        cy.pushToLog('Test service rep cleaned up')
      })
    
    cy.pushToLog('Test cleanup complete')
    cy.flushLogBuffer()
  });
}); 