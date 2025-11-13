describe('Fluxo de Logout', () => {
  it('deve fazer logout com sucesso', () => {
    // Login
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Fazer logout
    cy.get('[data-testid="user-menu"]').click();
    cy.contains('Sair').click();
    
    // Verificar se voltou para login
    cy.url().should('include', '/login');
  });

  it('deve limpar token após logout', () => {
    // Login
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Fazer logout
    cy.get('[data-testid="user-menu"]').click();
    cy.contains('Sair').click();
    
    // Verificar se o token foi removido
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.null;
    });
  });

  it('não deve permitir acesso após logout', () => {
    // Login
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Fazer logout
    cy.get('[data-testid="user-menu"]').click();
    cy.contains('Sair').click();
    
    // Tentar acessar página protegida
    cy.visit('http://localhost:8080/dashboard');
    
    // Deve redirecionar para login
    cy.url().should('include', '/login');
  });
});
