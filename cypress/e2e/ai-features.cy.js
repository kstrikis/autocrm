import { supabase, supabaseAdmin } from '../support/supabase.js'

describe('AI Features', () => {
  const TEST_PASSWORD = 'Password123!'
  let testServiceRep;
  let continueTests = false;
  let testPassed = true;

  // Helper function to wait for continue button
  const waitForContinue = (message) => {
    continueTests = false;
    testPassed = true; // Reset test status for new check
    cy.logStep(`Waiting for continue button: ${message}`)

    // Create a promise that resolves on button click
    const waitForClick = new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (continueTests) {
          clearInterval(checkInterval);
          if (!testPassed) {
            reject(new Error('Test was marked as failed by user'));
          } else {
            resolve();
          }
        }
      }, 100);
    });

    // Wrap the promise in a cy.wrap with timeout
    return cy.wrap(waitForClick, { timeout: 30000 });
  };

  before(() => {
    cy.startLifecycleSegment('Test Setup', true)
    cy.pushToLog('Starting AI features test setup')
    
    // Any one-time setup can go here
    
    cy.pushToLog('Test setup complete')
    cy.flushLogBuffer()
  });

  beforeEach(() => {
    cy.startLifecycleSegment('Test Preparation', true)
    cy.logStep('Setting up test environment')
    
    // Visit root and log in
    cy.visit('/')
    cy.contains('Demo Service Rep').click()
    cy.url().should('include', '/dashboard')
    cy.logStep('Logged in as service rep')
    
    // Add continue and fail buttons to the page if they don't exist
    cy.window().then((win) => {
      if (!win.document.getElementById('cypress-continue-btn')) {
        // Continue button
        const btnContinue = win.document.createElement('button');
        btnContinue.id = 'cypress-continue-btn';
        btnContinue.innerHTML = 'Continue to Next Step';
        btnContinue.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; padding: 10px; background: #4CAF50; color: white; border: none; cursor: pointer;';
        btnContinue.onclick = () => {
          console.log('Continue button clicked');
          continueTests = true;
        };
        win.document.body.appendChild(btnContinue);

        // Fail button
        const btnFail = win.document.createElement('button');
        btnFail.id = 'cypress-fail-btn';
        btnFail.innerHTML = 'Fail Test';
        btnFail.style.cssText = 'position: fixed; top: 10px; right: 200px; z-index: 9999; padding: 10px; background: #dc3545; color: white; border: none; cursor: pointer;';
        btnFail.onclick = () => {
          console.log('Fail button clicked');
          testPassed = false;
          continueTests = true;
        };
        win.document.body.appendChild(btnFail);
      }
    });

    waitForContinue('Starting test');
    cy.logStep('Test preparation complete')
  });

  it('Test 1: Basic AI Response', () => {
    cy.startSegment('Basic AI Response Test')
    
    cy.logStep('Submitting basic AI input')
    cy.get('textarea[data-testid="ai-input-textarea"]')
      .should('be.visible')
      .clear()
      .type('Show me the status of all open tickets')
    
    cy.get('button[data-testid="ai-input-process"]')
      .click()
    
    // Wait for initial processing
    cy.wait(5000)
    
    // Manual verification
    waitForContinue('Verify the AI response is appropriate');
    cy.logStep('Test complete', { complete: true })
  });

  it('Test 2: Complex Query Handling', () => {
    cy.startSegment('Complex Query Test')
    
    cy.logStep('Submitting complex AI input')
    cy.get('textarea[data-testid="ai-input-textarea"]')
      .should('be.visible')
      .clear()
      .type('Find all high priority tickets from manufacturing customers')
    
    cy.get('button[data-testid="ai-input-process"]')
      .click()
    
    // Wait for initial processing
    cy.wait(5000)
    
    // Manual verification
    waitForContinue('Verify the AI handled the complex query appropriately');
    cy.logStep('Test complete', { complete: true })
  });

  it('Test 3: Error Handling', () => {
    cy.startSegment('Error Handling Test')
    
    cy.logStep('Submitting invalid AI input')
    cy.get('textarea[data-testid="ai-input-textarea"]')
      .should('be.visible')
      .clear()
      .type('This is an invalid request that should trigger an error')
    
    cy.get('button[data-testid="ai-input-process"]')
      .click()
    
    // Wait for initial processing
    cy.wait(5000)
    
    // Manual verification
    waitForContinue('Verify the error was handled appropriately');
    cy.logStep('Test complete', { complete: true })
  });

  it('Test 4: Response Time Verification', () => {
    cy.startSegment('Response Time Test')
    
    cy.logStep('Submitting timed AI input')
    cy.get('textarea[data-testid="ai-input-textarea"]')
      .should('be.visible')
      .clear()
      .type('List all tickets assigned to me')
    
    cy.get('button[data-testid="ai-input-process"]')
      .click()
    
    // Wait for initial processing
    cy.wait(5000)
    
    // Manual verification
    waitForContinue('Verify the response time was acceptable');
    cy.logStep('Test complete', { complete: true })
  });

  it('Test 5: Context Retention', () => {
    cy.startSegment('Context Retention Test')
    
    cy.logStep('Submitting context-dependent AI input')
    cy.get('textarea[data-testid="ai-input-textarea"]')
      .should('be.visible')
      .clear()
      .type('Show me more details about that last ticket')
    
    cy.get('button[data-testid="ai-input-process"]')
      .click()
    
    // Wait for initial processing
    cy.wait(5000)
    
    // Manual verification
    waitForContinue('Verify the context was retained correctly');
    cy.logStep('Test complete', { complete: true })
  });
}); 