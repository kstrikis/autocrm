describe('Service Rep Access', () => {
  beforeEach(() => {
    // Start with a clean slate
    cy.visit('/');
    cy.clearLocalStorage();
    cy.log('Cleared local storage and visited root URL');
  });

  it('service rep should see all tickets and users', () => {
    // Log initial state
    cy.log('Starting service rep access test');
    console.log('Starting service rep access test'); // Add console.log for terminal output

    // Click the service rep demo login button
    cy.contains('button', 'Demo Service Rep')
      .should('be.visible')
      .click()
      .then(() => {
        cy.log('Clicked Demo Service Rep button');
        console.log('Clicked Demo Service Rep button');
      });

    // Wait for navigation and verify we're logged in
    cy.url().should('include', '/dashboard')
      .then(url => {
        cy.log(`Navigated to: ${url}`);
        console.log(`Navigated to: ${url}`);
      });

    // Go to tickets tab and count tickets
    cy.contains('a', 'Tickets').click();
    cy.url().should('include', '/tickets');
    cy.contains('h1', 'Support Tickets').should('be.visible');
    cy.get('table tbody tr').then($rows => {
      const ticketCount = $rows.length;
      cy.log(`Found ${ticketCount} tickets`);
      console.log(`Found ${ticketCount} tickets`);
      // We expect to see all tickets (3 from seed data)
      expect(ticketCount).to.equal(3);
    });

    // Go to users tab and count users
    cy.contains('a', 'Users').click();
    cy.url().should('include', '/users');
    cy.contains('h1', 'Users').should('be.visible');
    cy.get('table tbody tr').then($rows => {
      const userCount = $rows.length;
      cy.log(`Found ${userCount} users`);
      console.log(`Found ${userCount} users`);
      // We expect to see all users (5 from seed data - 2 customers, 2 service reps, 1 admin)
      expect(userCount).to.equal(5);
    });
  });
}); 