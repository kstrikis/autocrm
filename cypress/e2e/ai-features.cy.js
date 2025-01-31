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

//   it('Test 1: Basic AI Response', () => {
//     cy.startSegment('Basic AI Response Test')
    
//     cy.logStep('Submitting basic AI input')
//     cy.get('textarea[data-testid="ai-input-textarea"]')
//       .should('be.visible')
//       .clear()
//       .type('Show me the status of all open tickets')
    
//     cy.get('button[data-testid="ai-input-process"]')
//       .click()
    
//     // Wait for initial processing
//     cy.wait(5000)
    
//     // Manual verification
//     waitForContinue('Verify the AI response is appropriate');
//     cy.logStep('Test complete', { complete: true })
//   });

//   it('Test 2: Complex Query Handling', () => {
//     cy.startSegment('Complex Query Test')
    
//     cy.logStep('Submitting complex AI input')
//     cy.get('textarea[data-testid="ai-input-textarea"]')
//       .should('be.visible')
//       .clear()
//       .type('Find all high priority tickets from manufacturing customers')
    
//     cy.get('button[data-testid="ai-input-process"]')
//       .click()
    
//     // Wait for initial processing
//     cy.wait(5000)
    
//     // Manual verification
//     waitForContinue('Verify the AI handled the complex query appropriately');
//     cy.logStep('Test complete', { complete: true })
//   });

//   it('Test 3: Error Handling', () => {
//     cy.startSegment('Error Handling Test')
    
//     cy.logStep('Submitting invalid AI input')
//     cy.get('textarea[data-testid="ai-input-textarea"]')
//       .should('be.visible')
//       .clear()
//       .type('This is an invalid request that should trigger an error')
    
//     cy.get('button[data-testid="ai-input-process"]')
//       .click()
    
//     // Wait for initial processing
//     cy.wait(5000)
    
//     // Manual verification
//     waitForContinue('Verify the error was handled appropriately');
//     cy.logStep('Test complete', { complete: true })
//   });

//   it('Test 4: Response Time Verification', () => {
//     cy.startSegment('Response Time Test')
    
//     cy.logStep('Submitting timed AI input')
//     cy.get('textarea[data-testid="ai-input-textarea"]')
//       .should('be.visible')
//       .clear()
//       .type('List all tickets assigned to me')
    
//     cy.get('button[data-testid="ai-input-process"]')
//       .click()
    
//     // Wait for initial processing
//     cy.wait(5000)
    
//     // Manual verification
//     waitForContinue('Verify the response time was acceptable');
//     cy.logStep('Test complete', { complete: true })
//   });

//   it('Test 5: Context Retention', () => {
//     cy.startSegment('Context Retention Test')
    
//     cy.logStep('Submitting context-dependent AI input')
//     cy.get('textarea[data-testid="ai-input-textarea"]')
//       .should('be.visible')
//       .clear()
//       .type('Show me more details about that last ticket')
    
//     cy.get('button[data-testid="ai-input-process"]')
//       .click()
    
//     // Wait for initial processing
//     cy.wait(5000)
    
//     // Manual verification
//     waitForContinue('Verify the context was retained correctly');
//     cy.logStep('Test complete', { complete: true })
//   });

// Test 1: Forklift Inspection Note (Internal)
// • Service rep (Carol Service) input: “For the Toyota forklift, I inspected it and found a crack near the mast assembly. Please note the hydraulic leak.”
//
// Actions:
//   // add_note [internal]: "Inspected the Toyota forklift and confirmed a hydraulic leak near the mast assembly."
//
// Intended ticket:
//   // Intended ticket: "Toyota 8FGU25 forklift hydraulic leak" – Customer: John Warehouse (ticket must be assigned to Carol Service)

    it('Test 1: Forklift Inspection Note', () => {
    cy.startSegment('Forklift Inspection Note Test')
    
    cy.logStep('Submitting rep input for Toyota forklift ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('For the Toyota forklift, I inspected it and found a crack near the mast assembly. Please note the hydraulic leak.')
    
    // Rep thoughts:
    // add_note [internal]: "Inspected the Toyota forklift and confirmed a hydraulic leak near the mast assembly."
    // Intended ticket: "Toyota 8FGU25 forklift hydraulic leak" – John Warehouse, assigned to Carol Service

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the internal note was added to the Toyota forklift ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 2: Excavator Serial Request & Status Change (Customer Note Overridden)
    // • Service rep input: “The CAT excavator won’t start. Can you please send me the CAT 320 serial number from the side panel?”
    // 
    // Actions:
    //   // add_note [customer visible]: "Could you please provide the CAT 320 serial number from the side panel?"
    //   // update_status -> pending_customer
    //
    // Intended ticket:
    //   // Intended ticket: "CAT excavator won't start" – Customer: Sarah Builder

    it('Test 2: Excavator Serial Request & Status Change', () => {
    cy.startSegment('Excavator Serial Request Test')
    
    cy.logStep('Submitting rep input for CAT excavator ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('The CAT excavator won’t start. Can you please send me the CAT 320 serial number from the side panel?')
    
    // Rep thoughts:
    // add_note [customer visible]: "Could you please provide the CAT 320 serial number from the side panel?"
    // update_status -> pending_customer
    // Intended ticket: "CAT excavator won't start" – Sarah Builder

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the note and status change on the CAT excavator ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 3: Self-Assign CNC Spindle Ticket
    // • Service rep input: “I am taking over the CNC spindle alignment error ticket.”
    //
    // Actions:
    //   // assign_ticket -> self: "Assign this CNC machine spindle alignment error ticket to me."
    //   // (Optional) update_status -> open
    //
    // Intended ticket:
    //   // Intended ticket: "CNC machine spindle alignment error" – Customer: Lisa Plant

    it('Test 3: Self-Assign CNC Spindle Ticket', () => {
    cy.startSegment('Self-Assign CNC Ticket Test')
    
    cy.logStep('Submitting rep input for CNC spindle ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('I am taking over the CNC spindle alignment error ticket.')
    
    // Rep thoughts:
    // assign_ticket -> self: "Assign this CNC machine spindle alignment error ticket to me."
    // (Optional) update_status -> open
    // Intended ticket: "CNC machine spindle alignment error" – Lisa Plant

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the CNC ticket has been assigned to the service rep.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 4: Dock Leveler Inspection and Tag Update
    // • Service rep input: “I will inspect the dock leveler in Bay 3; it might be a hydraulic issue. Please tag for hydraulic-check.”
    //
    // Actions:
    //   // add_note [internal]: "Planning an inspection for the dock leveler – suspect hydraulic issues."
    //   // update_tags -> add: ["hydraulic-check"]
    //
    // Intended ticket:
    //   // Intended ticket: "Dock leveler malfunction - Bay 3" – Customer: Mike Shipper

    it('Test 4: Dock Leveler Inspection and Tag Update', () => {
    cy.startSegment('Dock Leveler Inspection Test')
    
    cy.logStep('Submitting rep input for dock leveler malfunction')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('I will inspect the dock leveler in Bay 3; it might be a hydraulic issue. Please tag for hydraulic-check.')
    
    // Rep thoughts:
    // add_note [internal]: "Planning an inspection for the dock leveler – suspect hydraulic issues."
    // update_tags -> add: ["hydraulic-check"]
    // Intended ticket: "Dock leveler malfunction - Bay 3" – Mike Shipper

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the internal note and tag update on the dock leveler ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 5: Electric Pallet Jack Troubleshooting
    // • Service rep input: “The electric pallet jack shows reduced runtime. I will investigate further.”
    //
    // Actions:
    //   // add_note [internal]: "Investigating the pallet jack battery issue; runtime reduced significantly."
    //   // update_status -> open
    //
    // Intended ticket:
    //   // Intended ticket: "Electric pallet jack battery issues" – Customer: Mike Shipper

    it('Test 5: Electric Pallet Jack Troubleshooting', () => {
    cy.startSegment('Pallet Jack Issue Test')
    
    cy.logStep('Submitting rep input for pallet jack battery issues')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('The electric pallet jack shows reduced runtime. I will investigate further.')
    
    // Rep thoughts:
    // add_note [internal]: "Investigating the pallet jack battery issue; runtime reduced significantly."
    // update_status -> open
    // Intended ticket: "Electric pallet jack battery issues" – Mike Shipper

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the troubleshooting note and status update on the pallet jack ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 6: Update Tags for Skid Steer
    // • Service rep input: “Please update the Bobcat skid steer ticket with tags for tracks and mechanical issues.”
    //
    // Actions:
    //   // update_tags -> add: ["tracks", "mechanical"]
    //
    // Intended ticket:
    //   // Intended ticket: "Bobcat skid steer tracks loose" – Customer: Sarah Builder

    it('Test 6: Update Tags for Skid Steer', () => {
    cy.startSegment('Skid Steer Tag Update Test')
    
    cy.logStep('Submitting rep input for Bobcat skid steer ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Please update the Bobcat skid steer ticket with tags for tracks and mechanical issues.')
    
    // Rep thoughts:
    // update_tags -> add: ["tracks", "mechanical"]
    // Intended ticket: "Bobcat skid steer tracks loose" – Sarah Builder

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the tags have been updated on the skid steer ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 7: Self-Assign Container Spreader Ticket
    // • Service rep input: “Assign the container spreader ticket to me and mark it as open.”
    //
    // Actions:
    //   // assign_ticket -> self: "Assign container spreader ticket to me."
    //   // update_status -> open
    //
    // Intended ticket:
    //   // Intended ticket: "Container spreader thing not locking properly" – Customer: Paul Docker

    it('Test 7: Self-Assign Container Spreader Ticket', () => {
    cy.startSegment('Container Spreader Assignment Test')
    
    cy.logStep('Submitting rep input for container spreader ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Assign the container spreader ticket to me and mark it as open.')
    
    // Rep thoughts:
    // assign_ticket -> self: "Assign container spreader ticket to me."
    // update_status -> open
    // Intended ticket: "Container spreader thing not locking properly" – Paul Docker

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the container spreader ticket is assigned to the rep and marked open.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 8: STS Crane Fault Investigation
    // • Service rep input: “I suspect an electrical fault with the STS Crane. I will take this ticket.”
    //
    // Actions:
    //   // add_note [internal]: "Investigating possible electrical issues causing power loss on the crane."
    //   // assign_ticket -> self: "Assign this crane ticket to me."
    //
    // Intended ticket:
    //   // Intended ticket: "STS Crane #3 keeps losing power" – Customer: Paul Docker

    it('Test 8: STS Crane Fault Investigation', () => {
    cy.startSegment('STS Crane Fault Test')
    
    cy.logStep('Submitting rep input for STS Crane ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('I suspect an electrical fault with the STS Crane. I will take this ticket.')
    
    // Rep thoughts:
    // add_note [internal]: "Investigating possible electrical issues causing power loss on the crane."
    // assign_ticket -> self: "Assign this crane ticket to me."
    // Intended ticket: "STS Crane #3 keeps losing power" – Paul Docker

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the internal note and the assignment on the STS Crane ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 9: Reach Stacker Tire Recheck Note
    // • Service rep input: “Please recheck the tire pressure on the reach stacker; readings seem off.”
    //
    // Actions:
    //   // add_note [internal]: "Request a recheck of the reach stacker tire pressure due to abnormal readings."
    //
    // Intended ticket:
    //   // Intended ticket: "Low tire pressure on the reach stacker" – Customer: Paul Docker

    it('Test 9: Reach Stacker Tire Recheck Note', () => {
    cy.startSegment('Reach Stacker Tire Recheck Test')
    
    cy.logStep('Submitting rep input for reach stacker tire issue')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Please recheck the tire pressure on the reach stacker; readings seem off.')
    
    // Rep thoughts:
    // add_note [internal]: "Request a recheck of the reach stacker tire pressure due to abnormal readings."
    // Intended ticket: "Low tire pressure on the reach stacker" – Paul Docker

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the internal note appears on the reach stacker ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 10: Combine Overheating Customer Notice
    // • Service rep input: “Inform the customer that a service appointment is set for the John Deere combine due to overheating.”
    //
    // Actions:
    //   // add_note [customer visible]: "A service appointment has been scheduled to address the engine overheating."
    //   // update_status -> pending_customer
    //
    // Intended ticket:
    //   // Intended ticket: "John Deere combine harvester engine overheating" – Customer: Tom Farmer

    it('Test 10: Combine Overheating Customer Notice', () => {
    cy.startSegment('Combine Overheating Notice Test')
    
    cy.logStep('Submitting rep input for combine harvester overheating ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Inform the customer that a service appointment is set for the John Deere combine due to overheating.')
    
    // Rep thoughts:
    // add_note [customer visible]: "A service appointment has been scheduled to address the engine overheating."
    // update_status -> pending_customer
    // Intended ticket: "John Deere combine harvester engine overheating" – Tom Farmer

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the customer note and status update on the combine harvester ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 11: Metal Detector Recalibration Note
    // • Service rep input: “I need to recalibrate the metal detector. Please note the recalibration steps for our records.”
    //
    // Actions:
    //   // add_note [internal]: "Review and perform recalibration of the metal detector as per standard procedures."
    //
    // Intended ticket:
    //   // Intended ticket: "Metal detector calibration drift" – Customer: Amy Process

    it('Test 11: Metal Detector Recalibration Note', () => {
    cy.startSegment('Metal Detector Recalibration Test')
    
    cy.logStep('Submitting rep input for metal detector calibration drift ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('I need to recalibrate the metal detector. Please note the recalibration steps for our records.')
    
    // Rep thoughts:
    // add_note [internal]: "Review and perform recalibration of the metal detector as per standard procedures."
    // Intended ticket: "Metal detector calibration drift" – Amy Process

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the internal note appears on the metal detector ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 12: Pallet Wrapper Ticket with Typos
    // • Service rep input (with typos): “I wannt to assgn this ticket to me and updte the statuus for the pallet wrapper issue.”
    //
    // Actions:
    //   // assign_ticket -> self: "Assign this pallet wrapper ticket to me."
    //   // update_status -> open
    //   // add_note [internal]: "Will address the pallet wrapper tension issue."
    //
    // Intended ticket:
    //   // Intended ticket: "Pallet wrapper tension issues" – Customer: Karen Store

    it('Test 12: Pallet Wrapper Ticket with Typos', () => {
    cy.startSegment('Pallet Wrapper Typos Test')
    
    cy.logStep('Submitting rep input with typos for pallet wrapper ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('I wannt to assgn this ticket to me and updte the statuus for the pallet wrapper issue.')
    
    // Rep thoughts:
    // assign_ticket -> self: "Assign this pallet wrapper ticket to me."
    // update_status -> open
    // add_note [internal]: "Will address the pallet wrapper tension issue."
    // Intended ticket: "Pallet wrapper tension issues" – Karen Store

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the ticket is self-assigned, open, and the note is added.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 13: Shredder Overload Detailed Note & Tags
    // • Service rep input: “Add a note that previous maintenance did not resolve the overload issue and we need to check the circuit. Also update tags.”
    //
    // Actions:
    //   // add_note [internal]: "Noting that previous maintenance did not resolve the overload issue; circuit checks are now scheduled."
    //   // update_tags -> add: ["overload", "check-circuit"]
    //
    // Intended ticket:
    //   // Intended ticket: "Shredder overload protection trips" – Customer: Rachel Green

    it('Test 13: Shredder Overload Detailed Note & Tags', () => {
    cy.startSegment('Shredder Overload Test')
    
    cy.logStep('Submitting rep input for shredder overload ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Add a note that previous maintenance did not resolve the overload issue and we need to check the circuit. Also update tags.')
    
    // Rep thoughts:
    // add_note [internal]: "Noting that previous maintenance did not resolve the overload issue; circuit checks are now scheduled."
    // update_tags -> add: ["overload", "check-circuit"]
    // Intended ticket: "Shredder overload protection trips" – Rachel Green

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the long note and tag update on the shredder ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 14: Magnetic Separator Tag Adjustments
    // • Service rep input: “For the magnetic separator ticket, note that an inspection is planned and update tags accordingly.”
    //
    // Actions:
    //   // add_note [internal]: "Plan to inspect the magnetic separator belt alignment."
    //   // update_tags -> add: ["alignment-inspection"]
    //   // update_tags -> remove: ["duplicate"]
    //
    // Intended ticket:
    //   // Intended ticket: "Magnetic separator belt misalignment" – Customer: Rachel Green

    it('Test 14: Magnetic Separator Tag Adjustments', () => {
    cy.startSegment('Magnetic Separator Tag Adjustments Test')
    
    cy.logStep('Submitting rep input for magnetic separator ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('For the magnetic separator ticket, note that an inspection is planned and update tags accordingly.')
    
    // Rep thoughts:
    // add_note [internal]: "Plan to inspect the magnetic separator belt alignment."
    // update_tags -> add: ["alignment-inspection"]
    // update_tags -> remove: ["duplicate"]
    // Intended ticket: "Magnetic separator belt misalignment" – Rachel Green

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the note is added and tags updated on the magnetic separator ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 15: Conveyor Ticket Resolution
    // • Service rep input: “The conveyor belt misalignment issue has been fixed. Mark it as resolved.”
    //
    // Actions:
    //   // update_status -> resolved
    //   // add_note [internal]: "Confirmed resolution of the conveyor belt alignment issue."
    //
    // Intended ticket:
    //   // Intended ticket: "Conveyor belt misalignment" – Customer: Dave Miner

    it('Test 15: Conveyor Ticket Resolution', () => {
    cy.startSegment('Conveyor Resolution Test')
    
    cy.logStep('Submitting rep input for conveyor misalignment ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('The conveyor belt misalignment issue has been fixed. Mark it as resolved.')
    
    // Rep thoughts:
    // update_status -> resolved
    // add_note [internal]: "Confirmed resolution of the conveyor belt alignment issue."
    // Intended ticket: "Conveyor belt misalignment" – Dave Miner

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the status is set to resolved and the note is present on the conveyor ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 16: Irrigation Pump Onsite Testing Note
    // • Service rep input: “Set the irrigation pump ticket to pending internal and note that onsite testing is scheduled.”
    //
    // Actions:
    //   // update_status -> pending_internal
    //   // add_note [internal]: "Scheduling onsite testing to investigate the pressure fluctuation in the irrigation pump."
    //
    // Intended ticket:
    //   // Intended ticket: "Irrigation pump pressure fluctuation" – Customer: Tom Farmer

    it('Test 16: Irrigation Pump Onsite Testing Note', () => {
    cy.startSegment('Irrigation Pump Test')
    
    cy.logStep('Submitting rep input for irrigation pump issue')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Set the irrigation pump ticket to pending internal and note that onsite testing is scheduled.')
    
    // Rep thoughts:
    // update_status -> pending_internal
    // add_note [internal]: "Scheduling onsite testing to investigate the pressure fluctuation in the irrigation pump."
    // Intended ticket: "Irrigation pump pressure fluctuation" – Tom Farmer

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the status update and internal note on the irrigation pump ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 17: Grain Auger Reassignment
    // • Service rep input: “Please reassign the grain auger ticket to me for further investigation of the bearing noise.”
    //
    // Actions:
    //   // assign_ticket -> self: "Assign this ticket to me."
    //   // add_note [internal]: "Reassigning the grain auger ticket to myself for a detailed bearing inspection."
    //
    // Intended ticket:
    //   // Intended ticket: "Grain auger bearing noise" – Customer: Tom Farmer

    it('Test 17: Grain Auger Reassignment', () => {
    cy.startSegment('Grain Auger Reassignment Test')
    
    cy.logStep('Submitting rep input for grain auger ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Please reassign the grain auger ticket to me for further investigation of the bearing noise.')
    
    // Rep thoughts:
    // assign_ticket -> self: "Assign this ticket to me."
    // add_note [internal]: "Reassigning the grain auger ticket to myself for a detailed bearing inspection."
    // Intended ticket: "Grain auger bearing noise" – Tom Farmer

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the grain auger ticket is now assigned to the rep.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 18: Packaging Line Servo Motor Fault
    // • Service rep input: “I will look into the servo motor fault on the packaging line. Mark the ticket as open.”
    //
    // Actions:
    //   // add_note [internal]: "Investigating servo motor fault on the packaging line."
    //   // update_status -> open
    //
    // Intended ticket:
    //   // Intended ticket: "Packaging line servo motor fault" – Customer: Amy Process

    it('Test 18: Packaging Line Servo Motor Fault', () => {
    cy.startSegment('Packaging Line Servo Fault Test')
    
    cy.logStep('Submitting rep input for packaging line servo motor ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('I will look into the servo motor fault on the packaging line. Mark the ticket as open.')
    
    // Rep thoughts:
    // add_note [internal]: "Investigating servo motor fault on the packaging line."
    // update_status -> open
    // Intended ticket: "Packaging line servo motor fault" – Amy Process

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the note and status change on the packaging line ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 19: ASRS Self-Assignment with Coordination Note
    // • Service rep input: “Assign the ASRS failure ticket to me and note that I will coordinate with logistics.”
    //
    // Actions:
    //   // assign_ticket -> self: "Assign this ASRS ticket to me."
    //   // add_note [internal]: "Assigning to me and coordinating with logistics for ASRS repair."
    //
    // Intended ticket:
    //   // Intended ticket: "Automated storage retrieval system failure" – Customer: Karen Store

    it('Test 19: ASRS Self-Assignment with Coordination Note', () => {
    cy.startSegment('ASRS Ticket Assignment Test')
    
    cy.logStep('Submitting rep input for ASRS failure ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Assign the ASRS failure ticket to me and note that I will coordinate with logistics.')
    
    // Rep thoughts:
    // assign_ticket -> self: "Assign this ASRS ticket to me."
    // add_note [internal]: "Assigning to me and coordinating with logistics for ASRS repair."
    // Intended ticket: "Automated storage retrieval system failure" – Karen Store

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the ticket is assigned and the internal note is added for ASRS.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 20: Robot Arm Calibration and Tag Update
    // • Service rep input: “Please note that I will handle the robot arm calibration drift and add appropriate tags.”
    //
    // Actions:
    //   // add_note [internal]: "Taking responsibility for investigating the robot arm calibration drift."
    //   // update_tags -> add: ["calibration", "robotics"]
    //
    // Intended ticket:
    //   // Intended ticket: "Robot arm calibration drift" – Customer: Lisa Plant

    it('Test 20: Robot Arm Calibration and Tag Update', () => {
    cy.startSegment('Robot Arm Calibration Test')
    
    cy.logStep('Submitting rep input for robot arm calibration ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Please note that I will handle the robot arm calibration drift and add appropriate tags.')
    
    // Rep thoughts:
    // add_note [internal]: "Taking responsibility for investigating the robot arm calibration drift."
    // update_tags -> add: ["calibration", "robotics"]
    // Intended ticket: "Robot arm calibration drift" – Lisa Plant

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the note and tag updates on the robot arm ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 21: Drill Rig Sensor Request for Customer
    // • Service rep input: “Please ask the customer to verify the hydraulic pressure sensor readings on the drill rig.”
    //
    // Actions:
    //   // add_note [customer visible]: "Please verify the current hydraulic pressure sensor readings."
    //   // update_status -> pending_customer
    //
    // Intended ticket:
    //   // Intended ticket: "Hydraulic drill rig pressure loss" – Customer: Dave Miner

    it('Test 21: Drill Rig Sensor Request for Customer', () => {
    cy.startSegment('Drill Rig Sensor Request Test')
    
    cy.logStep('Submitting rep input for hydraulic drill rig ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Please ask the customer to verify the hydraulic pressure sensor readings on the drill rig.')
    
    // Rep thoughts:
    // add_note [customer visible]: "Please verify the current hydraulic pressure sensor readings."
    // update_status -> pending_customer
    // Intended ticket: "Hydraulic drill rig pressure loss" – Dave Miner

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the customer note and status update on the drill rig ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 22: Preventive Maintenance Scheduling
    // • Service rep input: “Schedule the preventive maintenance inspection and add a tag for tracking.”
    //
    // Actions:
    //   // add_note [internal]: "Inspection scheduled for preventive maintenance of facility equipment."
    //   // update_tags -> add: ["preventative-maintenance"]
    //
    // Intended ticket:
    //   // Intended ticket: "Preventive maintenance check" – Customer: Alice Customer

    it('Test 22: Preventive Maintenance Scheduling', () => {
    cy.startSegment('Preventive Maintenance Test')
    
    cy.logStep('Submitting rep input for preventive maintenance ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Schedule the preventive maintenance inspection and add a tag for tracking.')
    
    // Rep thoughts:
    // add_note [internal]: "Inspection scheduled for preventive maintenance of facility equipment."
    // update_tags -> add: ["preventative-maintenance"]
    // Intended ticket: "Preventive maintenance check" – Alice Customer

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the internal note and tag update on the preventive maintenance ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 23: Upgrade Request Research Note
    // • Service rep input: “Add a note that I am researching compatible control system upgrades and mark this ticket as open.”
    //
    // Actions:
    //   // add_note [internal]: "Initiating compatibility research for the control system upgrade."
    //   // update_status -> open
    //
    // Intended ticket:
    //   // Intended ticket: "Upgrade request for control system" – Customer: Bob Customer

    it('Test 23: Upgrade Request Research Note', () => {
    cy.startSegment('Upgrade Request Test')
    
    cy.logStep('Submitting rep input for control system upgrade ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Add a note that I am researching compatible control system upgrades and mark this ticket as open.')
    
    // Rep thoughts:
    // add_note [internal]: "Initiating compatibility research for the control system upgrade."
    // update_status -> open
    // Intended ticket: "Upgrade request for control system" – Bob Customer

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify the note and status update on the control system upgrade ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 24: New Equipment Installation Tag Update
    // • Service rep input: “Please update the new equipment installation ticket with the tags quote and site-survey.”
    //
    // Actions:
    //   // update_tags -> add: ["quote", "site-survey"]
    //
    // Intended ticket:
    //   // Intended ticket: "New equipment installation quote" – Customer: Bob Customer

    it('Test 24: New Equipment Installation Tag Update', () => {
    cy.startSegment('New Equipment Tag Update Test')
    
    cy.logStep('Submitting rep input for new equipment installation ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('Please update the new equipment installation ticket with the tags quote and site-survey.')
    
    // Rep thoughts:
    // update_tags -> add: ["quote", "site-survey"]
    // Intended ticket: "New equipment installation quote" – Bob Customer

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the appropriate tags are added to the new equipment installation ticket.');
    cy.logStep('Test complete', { complete: true })
    });

    // Test 25: Dave's Drill Rig Clarification
    // • Service rep input: “For the drill rig ticket, please note that there is a hydraulic pressure drop issue. I will handle this ticket.”
    //
    // Actions:
    //   // add_note [internal]: "Clarifying hydraulic pressure drop issue; will review further details."
    //   // assign_ticket -> self: "Assign this drill rig ticket to me."
    //   // update_status -> open
    //
    // Intended ticket:
    //   // Intended ticket: "Hydraulic drill rig pressure loss" – Customer: Dave Miner

    it('Test 25: Dave\'s Drill Rig Clarification', () => {
    cy.startSegment('Dave\'s Drill Rig Clarification Test')
    
    cy.logStep('Submitting rep input for Dave’s drill rig ticket')
    cy.get('textarea[data-testid="ai-input-textarea"]')
        .should('be.visible')
        .clear()
        .type('For the drill rig ticket, please note that there is a hydraulic pressure drop issue. I will handle this ticket.')
    
    // Rep thoughts:
    // add_note [internal]: "Clarifying hydraulic pressure drop issue; will review further details."
    // assign_ticket -> self: "Assign this drill rig ticket to me."
    // update_status -> open
    // Intended ticket: "Hydraulic drill rig pressure loss" – Dave Miner

    cy.get('button[data-testid="ai-input-process"]').click()
    cy.wait(5000)
    waitForContinue('Verify that the note, assignment, and status update are applied to the drill rig ticket.');
    cy.logStep('Test complete', { complete: true })
    });
}); 