import { supabase, supabaseAdmin } from '../support/supabase.js'

describe('Test AI Function', () => {
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'
  let testCustomer;
  let testServiceRep;
  let testTicket;

  before(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting AI function test setup')
    
    // Clean up any existing test data first
    cy.task('log', { message: 'Starting thorough cleanup before test' })
    cy.cleanupTestTickets()
      .then(() => {
        cy.pushToLog('Creating test customer')
        return cy.createAdminManagedUser('customer@example.com', { 
          role: 'customer', 
          password: TEST_PASSWORD 
        })
      })
      .then((customer) => {
        testCustomer = customer
        cy.pushToLog(`Created test customer: ${customer.email}`)
        
        cy.pushToLog('Creating test service rep')
        return cy.createAdminManagedUser('rep@example.com', { 
          role: 'service_rep', 
          password: TEST_PASSWORD 
        })
      })
      .then((rep) => {
        testServiceRep = rep
        cy.pushToLog(`Created test service rep: ${rep.email}`)
        
        // Create test ticket for customer
        cy.pushToLog('Creating test ticket')
        cy.seedTestTickets([{
          title: 'Test Ticket for AI Function',
          description: 'This is a test ticket for testing the AI function',
          customerId: testCustomer.id,
          status: 'new',
          priority: 'medium'
        }])
        
        // Query for the created ticket
        return cy.wrap(
          supabaseAdmin
            .from('tickets')
            .select('*')
            .eq('title', 'Test Ticket for AI Function')
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

  it('should show unassigned test customer ticket', () => {
    cy.startSegment('Ticket Visibility Test')
    cy.logStep('Checking ticket list visibility')
    
    // Click the All Tickets tab
    cy.logStep('Clicking All Tickets tab')
    cy.contains('All Tickets').click()
    
    // Wait for navigation
    cy.logStep('Waiting for navigation')
    cy.url().should('include', '/tickets')
    
    // Wait for table to be visible and populated
    cy.logStep('Waiting for ticket table')
    cy.get('table').should('exist')
    cy.contains('td', 'Test Ticket for AI Function').should('be.visible')
    
    cy.logStep('Verifying test ticket visibility')
    cy.contains('Test Ticket for AI Function')
      .should('exist')
      .then(() => {
        cy.logStep('Test ticket title found')
      })
    
    cy.contains('customer')
      .should('exist')
      .then(() => {
        cy.logStep('Customer name found in ticket')
      })
      
    cy.logStep('Ticket visibility test complete', { complete: true })
  });

  it('should process test AI function input', () => {
    cy.startSegment('AI Function Test')
    cy.logStep('Starting AI function test')
    
    // Make sure we're on the dashboard
    cy.logStep('Ensuring we are on dashboard')
    cy.url().should('include', '/dashboard')
    
    // Type test message into test AI input with detailed logging
    cy.logStep('Locating AI input field')
    cy.get('textarea').first()
      .should('be.visible')
      .should('not.be.disabled')
      .then(() => {
        cy.logStep('Found AI input field')
        cy.logStep('Typing test message')
        return cy.get('textarea').first()
          .clear()
          .type(`assign customer's ticket to me`)
      })
    
    // Click test process button with logging
    cy.logStep('Submitting AI test input')
    cy.contains('button', 'Process').click()
      .then(() => {
        cy.logStep('Test input submitted')
      })
    
    // Verify success toast with detailed logging
    cy.logStep('Waiting for success toast')
    cy.contains('Test input processed successfully', { timeout: 2000 })
      .should('be.visible')
      .then(() => {
        cy.logStep('Success toast appeared')
      })
    
    cy.logStep('AI function test complete', { complete: true })
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