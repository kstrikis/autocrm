describe('AI Assistant Feature', () => {
  beforeEach(() => {
    cy.task('log', { message: 'Setting up AI assistant test' });
    cy.login('service_rep');
    cy.visit('/dashboard');
  });

  it('should process text input and create AI action', () => {
    cy.task('log', { message: 'Testing text input processing' });

    // Switch to AI tab
    cy.get('button[value="ai"]').click();

    // Type a note
    cy.get('textarea').type('I just picked up the hydraulic seals for Jack Smith');

    // Submit the note
    cy.get('button').contains('Process').click();

    // Verify success toast
    cy.get('[role="status"]').should('contain', 'Input processed successfully');

    // Switch to Actions tab
    cy.get('button[value="actions"]').click();

    // Verify the action appears in the table
    cy.get('table').within(() => {
      cy.contains('td', 'I just picked up the hydraulic seals for Jack Smith');
      cy.contains('td', 'Jack Smith');
    });
  });

  it('should handle voice input', () => {
    cy.task('log', { message: 'Testing voice input' });

    // Switch to AI tab
    cy.get('button[value="ai"]').click();

    // Mock the MediaRecorder API
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves(new MediaStream());
    });

    // Click the mic button
    cy.get('button').find('svg').should('exist').click();

    // Verify recording state
    cy.get('svg.text-red-500').should('exist');

    // Click again to stop recording
    cy.get('button').find('svg.text-red-500').click();

    // Verify recording stopped
    cy.get('svg.text-red-500').should('not.exist');
  });

  it('should allow approving and rejecting AI actions', () => {
    cy.task('log', { message: 'Testing AI action approval/rejection' });

    // Switch to AI tab and create a test action
    cy.get('button[value="ai"]').click();
    cy.get('textarea').type('Update status to resolved for Jack Smith');
    cy.get('button').contains('Process').click();

    // Switch to Actions tab
    cy.get('button[value="actions"]').click();

    // Find the pending action and approve it
    cy.get('table').within(() => {
      cy.contains('td', 'Update status to resolved for Jack Smith')
        .parent('tr')
        .within(() => {
          // Click approve button
          cy.get('button').first().click();
        });
    });

    // Verify success toast
    cy.get('[role="status"]').should('contain', 'Action executed successfully');

    // Create another action for rejection test
    cy.get('button[value="ai"]').click();
    cy.get('textarea').type('Invalid action for testing');
    cy.get('button').contains('Process').click();

    // Switch back to Actions tab
    cy.get('button[value="actions"]').click();

    // Find the pending action and reject it
    cy.get('table').within(() => {
      cy.contains('td', 'Invalid action for testing')
        .parent('tr')
        .within(() => {
          // Click reject button
          cy.get('button').last().click();
        });
    });

    // Verify rejection toast
    cy.get('[role="status"]').should('contain', 'Action rejected');
  });

  it('should handle AI preferences', () => {
    cy.task('log', { message: 'Testing AI preferences' });

    // Create an action that requires approval
    cy.get('button[value="ai"]').click();
    cy.get('textarea').type('Add note about hydraulic maintenance for Jack Smith');
    cy.get('button').contains('Process').click();

    // Verify the approval required toast
    cy.get('[role="status"]').should('contain', 'Action pending approval');

    // Switch to Actions tab and verify pending status
    cy.get('button[value="actions"]').click();
    cy.get('table').within(() => {
      cy.contains('td', 'Add note about hydraulic maintenance for Jack Smith')
        .parent('tr')
        .within(() => {
          cy.contains('Pending');
        });
    });
  });
}); 