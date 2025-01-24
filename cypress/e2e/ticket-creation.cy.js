describe('Ticket Creation', () => {
  beforeEach(() => {
    cy.cleanupTestTickets();
    cy.cleanupTestUser('customer@example.com');
    cy.createTestUser('customer@example.com', 'password123').then((response) => {
      const customerId = response.data.user.id;
      cy.task('log', { message: '🔍 Created test user with ID', customerId });
      
      cy.task('log', { message: '🎫 About to seed tickets with customerId', customerId });
      
      const tickets = [
        {
          title: 'Existing Ticket 1',
          description: 'This is an existing ticket',
          priority: 'low',
          status: 'new',
          customerId
        },
        {
          title: 'Existing Ticket 2',
          description: 'This is another existing ticket',
          priority: 'high',
          status: 'open',
          customerId
        }
      ];
      cy.task('log', { message: '📝 Ticket data', tickets });
      cy.seedTestTickets(tickets);
    });
    
    cy.task('log', { message: '🔑 Signing in', email: 'customer@example.com' });
    cy.supabaseSignIn('customer@example.com', 'password123');
    
    cy.task('log', { message: '🌐 Visiting dashboard' });
    cy.visit('/dashboard');
    
    cy.task('log', { message: '🎯 Clicking My Tickets nav link' });
    cy.contains('My Tickets').click();
    
    cy.task('log', { message: '⏳ Waiting for tickets to load' });
    // Wait for authentication to complete and tickets to load
    cy.contains('Existing Ticket 1', { timeout: 10000 }).should('be.visible').then(() => {
      cy.task('log', { message: '✅ Tickets loaded successfully' });
    });
  });

  afterEach(() => {
    cy.cleanupTestTickets();
    cy.cleanupTestUser('customer@example.com');
  });

  it('should create a new ticket successfully', () => {
    // Open form from dashboard layout
    cy.get('[data-test="new-ticket-button"]').click();

    // Fill out form
    cy.get('input[name="title"]').type('Test Ticket');
    cy.get('textarea[name="description"]').type('Test description');
    cy.get('[data-test="priority-select"]').click();
    cy.get('[role="option"]').contains('Medium').click();
    cy.get('input[name="title"]').click(); // Click outside to close dropdown

    // Submit
    cy.get('button').contains('Create Ticket').click();
    
    // Force reload in headless mode since subscriptions can be unreliable
    cy.reload();
    
    // Wait for tickets to load after reload
    cy.get('table').within(() => {
      cy.contains('Test Ticket', { timeout: 10000 }).should('be.visible');
    });
  });

  it('should show validation errors', () => {
    // Open form from dashboard layout
    cy.get('[data-test="new-ticket-button"]').click();

    // Submit empty form
    cy.contains('button', 'Create Ticket').click();

    // Verify validation messages
    cy.contains('Title is required').should('be.visible');
  });

  it('should edit a ticket successfully', () => {
    // Find and click edit button on first ticket
    cy.get('[data-test="edit-ticket-button"]').first().click();

    // Update form fields
    cy.get('input[name="title"]').clear().type('Updated Test Ticket');
    cy.get('textarea[name="description"]').clear().type('Updated test description');
    cy.get('[data-test="priority-select"]').click();
    cy.get('[role="option"]').contains('High').click();
    cy.get('[data-test="status-select"]').click();
    cy.get('[role="option"]').contains('Open').click();

    // Submit
    cy.get('button').contains('Update Ticket').click();
    
    // Force reload in headless mode since subscriptions can be unreliable
    cy.reload();
    
    // Wait for tickets to load after reload
    cy.get('table').within(() => {
      cy.contains('Updated Test Ticket', { timeout: 10000 }).should('be.visible');
    });
  });
}); 