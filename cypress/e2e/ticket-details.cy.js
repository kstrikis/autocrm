describe('Ticket Details', () => {
  beforeEach(() => {
    cy.cleanupTestTickets();
    cy.cleanupTestUser('customer@example.com');
    cy.createTestUser('customer@example.com', 'password123').then((response) => {
      const customerId = response.data.user.id;
      cy.task('log', { message: '🔍 Created test user with ID', customerId });
      
      cy.task('log', { message: '🎫 About to seed tickets with customerId', customerId });
      
      const tickets = [
        {
          title: 'Test Ticket',
          description: 'This is a test ticket',
          priority: 'medium',
          status: 'new',
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
    cy.contains('Test Ticket', { timeout: 10000 }).should('be.visible');
  });

  afterEach(() => {
    cy.cleanupTestTickets();
    cy.cleanupTestUser('customer@example.com');
  });

  it('should navigate to ticket details when clicking a ticket', () => {
    // Click on the ticket row
    cy.contains('Test Ticket').click();

    // Verify URL and content
    cy.url().should('include', '/tickets/');
    cy.contains('h1', 'Test Ticket').should('be.visible');
    cy.contains('This is a test ticket').should('be.visible');
  });

  it('should edit ticket from details page', () => {
    // Navigate to ticket details
    cy.contains('Test Ticket').click();

    // Click edit button
    cy.get('button').contains('Edit Ticket').click();

    // Update form fields
    cy.get('input[name="title"]').clear().type('Updated Test Ticket');
    cy.get('textarea[name="description"]').clear().type('Updated test description');
    cy.get('[data-test="priority-select"]').click();
    cy.get('[role="option"]').contains('High').click();
    cy.get('[data-test="status-select"]').click();
    cy.get('[role="option"]').contains('Open').click();

    // Submit
    cy.get('button').contains('Update Ticket').click();
    
    // Verify updates
    cy.contains('h1', 'Updated Test Ticket').should('be.visible');
    cy.contains('Updated test description').should('be.visible');
    cy.contains('High').should('be.visible');
    cy.contains('Open').should('be.visible');
  });

  it('should navigate back to tickets list', () => {
    // Navigate to ticket details
    cy.contains('Test Ticket').click();

    // Click back button
    cy.get('button').contains('Back to Tickets').click();

    // Verify we're back on the tickets list
    cy.url().should('include', '/tickets');
    cy.url().should('not.include', '/tickets/');
    cy.get('table').should('be.visible');
  });
}); 