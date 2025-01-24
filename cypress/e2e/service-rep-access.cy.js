describe('Service Rep Access', () => {
  beforeEach(() => {
    // Start with a clean slate - both tickets and users
    cy.task('log', { message: '🧹 Cleaning up test data' });
    cy.cleanupTestTickets();
    cy.cleanupTestUsers();

    // Create users and store their IDs properly
    cy.task('log', { message: '👥 Creating test users' });
    
    cy.createTestUser('test-customer1@example.com', 'StrongP@ssw0rd1')
    .then((userId) => {
      cy.wrap(userId).as('customer1');
      return cy.createTestUser('test-customer2@example.com', 'StrongP@ssw0rd2');
    })
    .then((userId) => {
      cy.wrap(userId).as('customer2');
    });
    
    // Seed tickets after both users are created
    cy.then(function() {
      cy.task('log', { 
        message: '🎫 Seeding test tickets',
        customer1: this.customer1,
        customer2: this.customer2,
        type1: typeof this.customer1,
        type2: typeof this.customer2
      });
      
      // Convert IDs to strings explicitly
      const customer1Id = String(this.customer1.data.user.id);
      const customer2Id = String(this.customer2.data.user.id);
      cy.task('log', { message: '**************Customer 1 created', customer1Id });
      cy.task('log', { message: '**************Customer 2 created', customer2Id });

      cy.seedTestTickets([
        {
          title: 'Test Ticket 1',
          description: 'Description for ticket 1',
          status: 'open',
          priority: 'high',
          customerId: customer1Id
        },
        {
          title: 'Test Ticket 2',
          description: 'Description for ticket 2',
          status: 'pendingInternal',
          priority: 'medium',
          customerId: customer2Id
        },
        {
          title: 'Test Ticket 3',
          description: 'Description for ticket 3',
          status: 'closed',
          priority: 'high',
          customerId: customer1Id
        }
      ]);
    });

    cy.visit('/');

    // Clear ALL auth state at the end of setup
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.task('log', { message: '🧹 Cleared all browser storage' });
    
    // Also explicitly sign out of Supabase
    cy.supabaseSignOut();
    cy.task('log', { message: '🚪 Signed out of Supabase' });

    cy.task('log', { message: '✅ Setup complete' });
  });

  afterEach(() => {
    cy.task('log', { message: '🧹 Cleaning up test data' });
    cy.cleanupTestTickets();
    cy.cleanupTestUsers();
  });

  it('service rep should see all tickets and users', () => {
    // Log initial state
    cy.task('log', { message: '🚀 Starting service rep access test' });

    // Click the service rep demo login button
    cy.task('log', { message: '🔑 Clicking demo service rep button' });
    cy.get('[data-testid="demo-service-rep-button"]').click();

    // Wait for navigation and verify we're logged in
    cy.task('log', { message: '✅ Successfully logged in and navigated to dashboard' });
    cy.url().should('include', '/dashboard');

    // Click the Tickets link in sidebar
    cy.task('log', { message: '🎫 Navigating to Tickets' });
    cy.contains('All Tickets').click();

    // Go to tickets tab and verify seeded tickets
    cy.task('log', { message: '👀 Verifying all seeded tickets are visible' });
    cy.get('[data-testid="ticket-list"]')
      .find('[data-testid="ticket-item"]')
      .should('have.length', 3);
    
    // Click the Users link in sidebar and verify seeded users
    cy.task('log', { message: '👥 Navigating to Users' });
    cy.contains('Users').click();
    
    // Verify seeded users, including the demo users (customer, service rep, admin)
    cy.task('log', { message: '👀 Verifying all seeded users are visible' });
    cy.get('[data-testid="user-list"]')
      .find('[data-testid="user-item"]')
      .should('have.length', 5);
  });
}); 