import { supabase, supabaseAdmin } from '../support/supabase.js'

describe('Process AI Action', () => {
  const TEST_PASSWORD = 'StrongP@ssw0rd123!'
  let testServiceRep;
  let customers = [];
  let tickets = [];

  const CUSTOMER_DATA = [
    { email: 'eva.smith@acme.com', fullName: 'Eva Smith', company: 'Acme Manufacturing' },
    { email: 'robert.jones@bigco.com', fullName: 'Robert Jones', company: 'BigCo Industries' },
    { email: 'sarah.wilson@tech.com', fullName: 'Sarah Wilson', company: 'Tech Solutions' },
    { email: 'james.miller@factory.com', fullName: 'James Miller', company: 'Factory Corp' },
    { email: 'maria.garcia@build.com', fullName: 'Maria Garcia', company: 'Build Better' },
    { email: 'william.brown@heavy.com', fullName: 'William Brown', company: 'Heavy Equipment Inc' },
    { email: 'linda.davis@construct.com', fullName: 'Linda Davis', company: 'Construction Plus' },
    { email: 'michael.lee@lift.com', fullName: 'Michael Lee', company: 'Lift Masters' },
    { email: 'patricia.white@machine.com', fullName: 'Patricia White', company: 'Machine Works' },
    { email: 'david.taylor@industrial.com', fullName: 'David Taylor', company: 'Industrial Systems' }
  ];

  const TICKET_TEMPLATES = [
    { title: 'Forklift hydraulic leak', description: 'Customer reported hydraulic fluid leaking from main lift cylinder', tags: ['hydraulic', 'forklift', 'leak'] },
    { title: 'Annual maintenance check', description: 'Scheduled yearly maintenance for all equipment', tags: ['maintenance', 'scheduled'] },
    { title: 'Emergency repair - production line', description: 'Production line stopped due to mechanical failure', tags: ['emergency', 'production'] },
    { title: 'Conveyor belt replacement', description: 'Wear and tear on main conveyor belt', tags: ['conveyor', 'replacement'] },
    { title: 'Safety inspection required', description: 'Regular safety inspection due for heavy machinery', tags: ['safety', 'inspection'] },
    { title: 'Forklift battery issues', description: 'Electric forklift not holding charge', tags: ['electrical', 'forklift', 'battery'] },
    { title: 'Crane calibration needed', description: 'Weight sensors showing incorrect readings', tags: ['calibration', 'crane'] },
    { title: 'Hydraulic press maintenance', description: 'Pressure inconsistent during operation', tags: ['hydraulic', 'pressure'] },
    { title: 'Loading dock repair', description: 'Dock leveler not functioning properly', tags: ['dock', 'repair'] },
    { title: 'Robot arm malfunction', description: 'Automated assembly line robot needs recalibration', tags: ['robot', 'automation'] }
  ];

  before(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting AI process test setup')
    
    // Clean up any existing test data first
    cy.task('log', { message: 'Starting thorough cleanup before test' })
    cy.cleanupTestTickets()
      .then(() => {
        // Create service rep first
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
        
        // Create all customers with proper company information
        const customerPromises = CUSTOMER_DATA.map(customer => 
          cy.createAdminManagedUser(customer.email, {
            role: 'customer',
            password: TEST_PASSWORD,
            fullName: customer.fullName,
            company: customer.company,  // Make sure company is included
            raw_user_meta_data: {  // Add company to metadata as well
              company: customer.company
            }
          }).then(createdCustomer => {
            // Store both the user data and the company info
            customers.push({
              ...createdCustomer,
              company: customer.company  // Add company to our local reference
            })
            cy.pushToLog(`Created customer: ${createdCustomer.full_name} at ${customer.company}`)
          })
        )
        
        return cy.wrap(Promise.all(customerPromises))
      })
      .then(() => {
        // Create 3 tickets for each customer using templates
        const ticketPromises = customers.flatMap(customer => 
          Array.from({ length: 3 }).map((_, i) => {
            const template = TICKET_TEMPLATES[Math.floor(Math.random() * TICKET_TEMPLATES.length)]
            const ticketTitle = `${template.title} - ${customer.company}`
        return cy.wrap(
          supabaseAdmin
            .from('tickets')
                .insert({
                  title: ticketTitle,
                  description: `${template.description} at ${customer.company}`,
                  customer_id: customer.id,
                  status: ['new', 'open', 'pending_customer'][Math.floor(Math.random() * 3)],
                  priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                  tags: template.tags
                })
                .select()
            ).then(({ data, error }) => {
              if (error) throw error
              tickets.push(data[0])
              cy.pushToLog(`Created ticket: ${ticketTitle} for ${customer.company}`)
            })
          })
        )
        
        return cy.wrap(Promise.all(ticketPromises))
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
    
    // Scroll AI Assistant into view and wait for it to be ready
    cy.contains('AI Assistant').scrollIntoView()
    cy.get('textarea[data-testid="ai-input-textarea"]').should('be.visible')
    
    cy.logStep('Service rep login complete')
  });

  const submitAIInput = (input) => {
    cy.logStep(`Submitting AI input: ${input}`)
    
    // Simple input and submit
    cy.get('textarea[data-testid="ai-input-textarea"]')
      .scrollIntoView()
      .should('be.visible')
      .clear()
      .type(input)
    
    cy.get('button[data-testid="ai-input-process"]')
      .click()
    
    // Wait for success toast
    cy.get('[role="status"]')
      .should('be.visible')
      .should('not.contain', 'Error')
  }

  const verifyAIAction = (expectedAction) => {
    cy.logStep('Verifying AI action in database')
    return cy.wrap(
      supabaseAdmin
        .from('ai_actions')
        .select('*, tickets!inner(*)')
        .eq('user_id', testServiceRep.id)
        .order('created_at', { ascending: false })
        .limit(1)
    ).then(({ data, error }) => {
      if (error) throw error
      const action = data[0]
      
      // Verify basic properties
      expect(action).to.exist
      expect(action.status).to.equal('pending')
      expect(action.requires_approval).to.be.true
      
      // Verify action matches expected
      if (expectedAction.type) {
        expect(action.action_type).to.equal(expectedAction.type)
      }
      
      // Verify interpreted action structure
      const interpreted = action.interpreted_action
      expect(interpreted).to.exist
      
      if (expectedAction.noteContent) {
        expect(interpreted.note_content).to.include(expectedAction.noteContent)
      }
      
      if (expectedAction.status) {
        expect(interpreted.status_update).to.equal(expectedAction.status)
      }
      
      if (expectedAction.tags) {
        expect(interpreted.tags_to_add).to.include.members(expectedAction.tags)
      }

      if (expectedAction.customerId) {
        expect(action.tickets.customer_id).to.equal(expectedAction.customerId)
      }
      
      // Verify confidence score exists and is reasonable
      expect(interpreted.confidence_score).to.be.within(0, 1)
      
      cy.logStep('AI action verification complete')
      return action
    })
  }

  it('should process AI input for adding a note', () => {
    cy.startSegment('Add Note Test')
    
    // Pick a random customer
    const targetCustomer = customers[Math.floor(Math.random() * customers.length)]
    const noteInput = `Add a note for ${targetCustomer.full_name} about hydraulic seal replacement needed`
    submitAIInput(noteInput)
    
    verifyAIAction({
      type: 'add_note',
      noteContent: 'hydraulic seal replacement',
      customerId: targetCustomer.id
    })
  });

  it('should process AI input for updating status', () => {
    cy.startSegment('Update Status Test')
    
    const targetCustomer = customers[Math.floor(Math.random() * customers.length)]
    const statusInput = `Mark ${targetCustomer.full_name}'s ticket as pending customer response`
    submitAIInput(statusInput)
    
    verifyAIAction({
      type: 'update_status',
      status: 'pending_customer',
      customerId: targetCustomer.id
    })
  });

  it('should process AI input for updating tags', () => {
    cy.startSegment('Update Tags Test')
    
    const targetCustomer = customers[Math.floor(Math.random() * customers.length)]
    const tagsInput = `Add tags hydraulic and maintenance to ${targetCustomer.full_name}'s ticket`
    submitAIInput(tagsInput)
    
    verifyAIAction({
      type: 'update_tags',
      tags: ['hydraulic', 'maintenance'],
      customerId: targetCustomer.id
    })
  });

  it('should handle multiple actions in one input', () => {
    cy.startSegment('Multiple Actions Test')
    
    const targetCustomer = customers[Math.floor(Math.random() * customers.length)]
    const multiInput = `For ${targetCustomer.full_name}'s ticket: add note about parts ordered, mark as pending internal, and tag as parts_pending`
    submitAIInput(multiInput)
    
    // Verify multiple actions were created
    cy.wrap(
      supabaseAdmin
        .from('ai_actions')
        .select('*, tickets!inner(*)')
        .eq('user_id', testServiceRep.id)
        .order('created_at', { ascending: false })
        .limit(3)
    ).then(({ data, error }) => {
      if (error) throw error
      
      // Should have created multiple actions
      expect(data.length).to.be.at.least(2)
      
      // All actions should be for the same customer
      data.forEach(action => {
        expect(action.tickets.customer_id).to.equal(targetCustomer.id)
      })
      
      // Verify we have the expected action types
      const actionTypes = data.map(a => a.action_type)
      expect(actionTypes).to.include('add_note')
      expect(actionTypes).to.include('update_status')
      expect(actionTypes).to.include('update_tags')
      
      cy.logStep('Multiple actions verified')
    })
  });

  it('should handle first name only reference', () => {
    cy.startSegment('First Name Reference Test')
    
    // Pick a random customer with an active ticket
    const targetCustomer = customers[Math.floor(Math.random() * customers.length)]
    const firstName = targetCustomer.full_name.split(' ')[0]
    
    const firstNameInput = `Hey, can you add a note to ${firstName}'s ticket about the replacement parts arriving next week?`
    submitAIInput(firstNameInput)
    
    // Verify the AI correctly identified the customer
    cy.wrap(
      supabaseAdmin
        .from('ai_actions')
        .select('*, tickets!inner(*)')
        .eq('user_id', testServiceRep.id)
        .order('created_at', { ascending: false })
        .limit(1)
    ).then(({ data }) => {
      const action = data[0]
      expect(action.tickets.customer_id).to.equal(targetCustomer.id)
      expect(action.action_type).to.equal('add_note')
      expect(action.interpreted_action.note_content).to.include('replacement parts arriving next week')
    })
  });

  it('should handle formal last name reference', () => {
    cy.startSegment('Formal Last Name Test')
    
    // Pick a random customer with a pending ticket
    const targetCustomer = customers[Math.floor(Math.random() * customers.length)]
    const lastName = targetCustomer.full_name.split(' ')[1]
    
    const formalInput = `Mr. ${lastName} needs their ticket updated to pending customer response`
    submitAIInput(formalInput)
    
    // Verify the AI correctly identified the customer
    cy.wrap(
      supabaseAdmin
        .from('ai_actions')
        .select('*, tickets!inner(*)')
        .eq('user_id', testServiceRep.id)
        .order('created_at', { ascending: false })
        .limit(1)
    ).then(({ data }) => {
      const action = data[0]
      expect(action.tickets.customer_id).to.equal(targetCustomer.id)
      expect(action.action_type).to.equal('update_status')
      expect(action.interpreted_action.status_update).to.equal('pending_customer')
    })
  });

  it('should handle poor grammar and typos with multiple customers', () => {
    cy.startSegment('Poor Grammar Test')
    
    // Pick two random customers
    const customer1 = customers[Math.floor(Math.random() * customers.length)]
    let customer2
    do {
      customer2 = customers[Math.floor(Math.random() * customers.length)]
    } while (customer2.id === customer1.id)
    
    const poorGrammarInput = `yo can u update ${customer1.full_name.split(' ')[0]}'s ticket n mark it resolved, also add note 4 ${customer2.full_name} bout calibration bein done kthx`
    submitAIInput(poorGrammarInput)
    
    // Verify actions for both customers
    cy.wrap(
      supabaseAdmin
        .from('ai_actions')
        .select('*, tickets!inner(*)')
        .eq('user_id', testServiceRep.id)
        .order('created_at', { ascending: false })
        .limit(3)
    ).then(({ data }) => {
      // Should have actions for both customers
      const customer1Actions = data.filter(a => a.tickets.customer_id === customer1.id)
      const customer2Actions = data.filter(a => a.tickets.customer_id === customer2.id)
      
      expect(customer1Actions).to.have.length.at.least(1)
      expect(customer2Actions).to.have.length.at.least(1)
      
      // Verify status update for customer 1
      const statusAction = customer1Actions.find(a => a.action_type === 'update_status')
      expect(statusAction.interpreted_action.status_update).to.equal('resolved')
      
      // Verify note for customer 2
      const noteAction = customer2Actions.find(a => a.action_type === 'add_note')
      expect(noteAction.interpreted_action.note_content).to.include('calibration')
    })
  });

  it('should handle colloquial note style', () => {
    cy.startSegment('Colloquial Notes Test')
    
    const targetCustomer = customers[Math.floor(Math.random() * customers.length)]
    const colloquialInput = `Hey, just fyi for ${targetCustomer.full_name} - checked out that weird noise they mentioned... turns out it's just a loose belt (classic!) 🔧 Should be an easy fix, but might need to order the heavy-duty version since they're running it pretty much 24/7 lol. Gonna tag this as #quick_fix and #preventative_maintenance if that's cool! 👍`
    submitAIInput(colloquialInput)
    
    // Verify note was cleaned up but maintained key information
    verifyAIAction({
      type: 'add_note',
      noteContent: 'loose belt',
      customerId: targetCustomer.id
    }).then(action => {
      // Verify tags were extracted despite casual language
      cy.wrap(
        supabaseAdmin
          .from('ai_actions')
          .select('*, tickets!inner(*)')
          .eq('user_id', testServiceRep.id)
          .eq('tickets.customer_id', targetCustomer.id)
          .order('created_at', { ascending: false })
          .limit(2)
      ).then(({ data }) => {
        const tagAction = data.find(a => a.action_type === 'update_tags')
        expect(tagAction.interpreted_action.tags_to_add).to.include.members(['quick_fix', 'preventative_maintenance'])
      })
    })
  });

  it('should infer customer from equipment context', () => {
    cy.startSegment('Context Inference Test')
    
    // Find a customer with a forklift-related ticket
    const forkliftTicket = tickets.find(t => t.tags.includes('forklift'))
    if (!forkliftTicket) throw new Error('No forklift ticket found in test data')
    
    const forkliftCustomer = customers.find(c => c.id === forkliftTicket.customer_id)
    
    const contextInput = `let the guy with the broken forklift know that we can look at it next week`
    submitAIInput(contextInput)
    
    // Verify the AI correctly identified the customer with the forklift issue
    cy.wrap(
      supabaseAdmin
        .from('ai_actions')
        .select('*, tickets!inner(*)')
        .eq('user_id', testServiceRep.id)
        .order('created_at', { ascending: false })
        .limit(1)
    ).then(({ data }) => {
      const action = data[0]
      expect(action.tickets.customer_id).to.equal(forkliftCustomer.id)
      expect(action.ticket_id).to.equal(forkliftTicket.id)
      expect(action.action_type).to.equal('add_note')
      expect(action.interpreted_action.note_content).to.include('can look at it next week')
    })
  });

  after(() => {
    cy.startLifecycleSegment('Test Cleanup', false)
    cy.pushToLog('Starting test cleanup')
    
    // Cleanup test data in correct order
    cy.cleanupTestTickets()
      .then(() => {
        cy.pushToLog('Test tickets cleaned up')
        // Clean up all customers
        return Promise.all(
          customers.map(customer => cy.cleanupTestUser(customer.email))
        )
      })
      .then(() => {
        cy.pushToLog('Test customers cleaned up')
        return cy.cleanupTestUser(testServiceRep.email)
      })
      .then(() => {
        cy.pushToLog('Test service rep cleaned up')
      })
    
    cy.pushToLog('Test cleanup complete')
    cy.flushLogBuffer()
  });
}); 