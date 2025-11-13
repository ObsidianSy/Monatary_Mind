describe('Fluxo do Dashboard', () => {
  beforeEach(() => {
    // Login antes de cada teste
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Navegar para dashboard
    cy.contains('Dashboard').click();
  });

  it('deve exibir cards de resumo financeiro', () => {
    cy.contains('Saldo Total').should('be.visible');
    cy.contains('Receitas').should('be.visible');
    cy.contains('Despesas').should('be.visible');
    cy.contains('Economia').should('be.visible');
  });

  it('deve exibir valores monetários', () => {
    cy.contains('R$').should('be.visible');
  });

  it('deve exibir gráfico de fluxo de caixa', () => {
    cy.contains('Fluxo de Caixa').should('be.visible');
  });

  it('deve aplicar filtro de período', () => {
    cy.get('select[name="periodo"]').select('mes_atual');
    cy.wait(500);
    
    // Verificar se o filtro foi aplicado
    cy.contains('Mês Atual').should('be.visible');
  });

  it('deve exibir transações recentes', () => {
    cy.contains('Transações Recentes').should('be.visible');
  });

  it('deve navegar para detalhes ao clicar em transação', () => {
    cy.get('[data-testid="transaction-item"]').first().click();
    
    // Verificar se abriu modal ou navegou
    cy.contains('Detalhes').should('be.visible');
  });
});
