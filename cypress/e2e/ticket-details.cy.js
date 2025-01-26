describe('Ticket Details', () => {
  beforeEach(() => {
    cy.task('log', { message: '🧹 Starting test cleanup' });
    cy.cleanupTestTickets();
    cy.cleanupTestUser('customer@example.com');

    cy.task('log', { message: '👤 Creating test user' });
    cy.createTestUser('customer@example.com', {
      fullName: 'Test Customer',
      role: 'customer'
    }).then((response) => {
      const customerId = response.data.user.id;
      cy.task('log', { message: '👤 Created test user', customerId });
      
      cy.task('log', { message: '🎫 Preparing test ticket data', customerId });
      const tickets = [
        {
          title: 'Test Ticket',
          description: 'This is a test ticket',
          priority: 'medium',
          status: 'new',
          customerId
        }
      ];
      cy.task('log', { message: '🎫 Test ticket data prepared', count: tickets.length, titles: tickets.map(t => t.title) });
      cy.seedTestTickets(tickets);
    });
    
    cy.task('log', { message: '🔑 Starting user authentication' });
    cy.supabaseSignIn('customer@example.com');
    
    cy.task('log', { message: '📱 Navigating to dashboard' });
    cy.visit('/dashboard');
    
    cy.task('log', { message: '🎯 Navigating to tickets page' });
    cy.contains('My Tickets').click();
    
    cy.task('log', { message: '⏳ Waiting for tickets to load' });
    cy.contains('Test Ticket', { timeout: 10000 }).should('be.visible');
  });

  afterEach(() => {
    cy.task('log', { message: '🧹 Starting cleanup after test' });
    cy.cleanupTestTickets();
    cy.cleanupTestUser('customer@example.com');
    cy.task('log', { message: '✅ Test cleanup completed' });
  });

  it('should navigate to ticket details when clicking a ticket', () => {
    cy.task('log', { message: '🔍 Testing ticket details navigation' });
    
    // Click on the ticket row
    cy.task('log', { message: '👆 Clicking ticket row' });
    cy.contains('Test Ticket').click();

    // Verify URL and content
    cy.task('log', { message: '🔍 Verifying navigation and content' });
    cy.url().should('include', '/tickets/');
    cy.contains('h1', 'Test Ticket').should('be.visible');
    cy.contains('This is a test ticket').should('be.visible');
    
    cy.task('log', { message: '✅ Ticket details navigation test completed' });
  });

  it('should edit ticket from details page', () => {
    cy.task('log', { message: '✏️ Testing ticket editing functionality' });
    
    // Navigate to ticket details
    cy.task('log', { message: '🔍 Navigating to ticket details' });
    cy.contains('Test Ticket').click();

    // Click edit button
    cy.task('log', { message: '👆 Opening edit form' });
    cy.get('button').contains('Edit Ticket').click();

    // Update form fields
    cy.task('log', { message: '📝 Updating ticket fields' });
    cy.get('input[name="title"]').clear().type('Updated Test Ticket');
    cy.get('textarea[name="description"]').clear().type('Updated test description');
    
    cy.task('log', { message: '📊 Setting ticket priority' });
    cy.get('[data-test="priority-select"]').click();
    cy.get('[role="option"]').contains('High').click();
    
    cy.task('log', { message: '📊 Setting ticket status' });
    cy.get('[data-test="status-select"]').click();
    cy.get('[role="option"]').contains('Open').click();

    // Submit form
    cy.task('log', { message: '💾 Submitting ticket updates' });
    cy.get('button').contains('Update Ticket').click();
    
    // Verify updates
    cy.task('log', { message: '🔍 Verifying ticket updates' });
    cy.contains('h1', 'Updated Test Ticket').should('be.visible');
    cy.contains('Updated test description').should('be.visible');
    cy.contains('high').should('be.visible');
    cy.contains('open').should('be.visible');
    
    cy.task('log', { message: '✅ Ticket edit test completed' });
  });

  it('should navigate back to tickets list', () => {
    cy.task('log', { message: '🔄 Testing navigation back to tickets list' });
    
    // Navigate to ticket details
    cy.task('log', { message: '🔍 Navigating to ticket details' });
    cy.contains('Test Ticket').click();

    // Click back button
    cy.task('log', { message: '👆 Clicking back button' });
    cy.get('button').contains('Back to Tickets').click();

    // Verify we're back on the tickets list
    cy.task('log', { message: '🔍 Verifying navigation back to tickets list' });
    cy.url().should('include', '/tickets');
    cy.url().should('not.include', '/tickets/');
    cy.get('table').should('be.visible');
    
    cy.task('log', { message: '✅ Navigation back test completed' });
  });
});