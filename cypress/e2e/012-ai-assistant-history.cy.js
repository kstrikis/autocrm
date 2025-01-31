import { supabase, supabaseAdmin } from '../support/supabase.js'

describe('AI Assistant History', () => {
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'
  let testServiceRep;
  let testCustomer;

  before(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting AI assistant history test setup')
    
    // Clean up any existing test data
    cy.task('log', { message: 'Starting cleanup before test' })
    cy.cleanupTestTickets()
      .then(() => {
        // Create service rep
        cy.pushToLog('Creating test service rep')
        return cy.createAdminManagedUser('test.rep@example.com', { 
          role: 'service_rep', 
          password: TEST_PASSWORD,
          fullName: 'Test Service Rep'
        })
      })
      .then((rep) => {
        testServiceRep = rep
        cy.pushToLog(`Created test service rep: ${rep.email}`)
        
        // Create a single test customer
        return cy.createAdminManagedUser('test.customer@example.com', {
          role: 'customer',
          password: TEST_PASSWORD,
          fullName: 'Test Customer',
          company: 'Test Company',
          raw_user_meta_data: {
            company: 'Test Company'
          }
        })
      })
      .then((customer) => {
        testCustomer = customer
        cy.pushToLog(`Created test customer: ${customer.email}`)
        
        // Create a single ticket for the customer
        return cy.wrap(
          supabaseAdmin
            .from('tickets')
            .insert({
              title: 'Test Equipment Maintenance',
              description: 'Regular maintenance check required',
              customer_id: customer.id,
              status: 'new',
              priority: 'medium',
              tags: ['maintenance']
            })
            .select()
        )
      })
      .then(({ data }) => {
        cy.pushToLog(`Created test ticket: ${data[0].title}`)
      })

    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  });

  beforeEach(() => {
    cy.startSegment('Test Preparation')
    cy.logStep('Logging in as service rep')
    
    // Login as service rep
    cy.supabaseSignIn(testServiceRep.email, { password: TEST_PASSWORD })
    cy.visit('/dashboard')
    
    // Make sure we're on the AI actions history tab
    cy.contains('AI Actions History').click()
    cy.get('[role="tabpanel"]').should('be.visible')
    
    cy.logStep('Service rep login complete')
  });

  it('should show AI action in history after processing', () => {
    cy.startSegment('AI Action History Test')
    
    const noteText = 'Scheduled maintenance for next Tuesday at 2 PM'
    const aiInput = `Add a note for Test Customer: ${noteText}`
    
    // Submit the AI input
    cy.logStep('Submitting AI input')
    cy.get('textarea[data-testid="ai-input-textarea"]')
      .should('be.visible')
      .clear()
      .type(aiInput)
    
    cy.get('button[data-testid="ai-input-process"]')
      .click()
    
    // Wait a reasonable time for LangChain processing
    cy.wait(5000)
    
    // Reload the page to ensure fresh data
    cy.reload()
    
    // Verify the action appears in the history table
    cy.logStep('Verifying action in history')
    cy.contains('AI Actions History').click()
    cy.get('table')
      .should('be.visible')
      .within(() => {
        cy.get('td')
          .contains(aiInput)
          .should('be.visible')
        cy.get('td')
          .contains('add_note')
          .should('be.visible')
        cy.get('td')
          .contains('pending')
          .should('be.visible')
      })
    
    // Double check in database
    cy.wrap(
      supabaseAdmin
        .from('ai_actions')
        .select('*, tickets!inner(*)')
        .eq('user_id', testServiceRep.id)
        .order('created_at', { ascending: false })
        .limit(1)
    ).then(({ data, error }) => {
      if (error) throw error
      const action = data[0]
      
      expect(action).to.exist
      expect(action.action_type).to.equal('add_note')
      expect(action.status).to.equal('pending')
      expect(action.requires_approval).to.be.true
      expect(action.interpreted_action.note_content).to.include(noteText)
      expect(action.tickets.customer_id).to.equal(testCustomer.id)
    })
  });

  after(() => {
    cy.startLifecycleSegment('Test Cleanup', false)
    cy.pushToLog('Starting test cleanup')
    
    // Cleanup test data
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