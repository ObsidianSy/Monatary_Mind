describe('Fluxo de Transações', () => {
  beforeEach(() => {
    // Login antes de cada teste
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Navegar para transações
    cy.contains('Transações').click();
  });

  it('deve listar transações existentes', () => {
    cy.url().should('include', '/transactions');
    cy.contains('Transações').should('be.visible');
  });

  it('deve abrir modal de nova transação', () => {
    cy.contains('button', 'Novo').click();
    cy.contains('Nova Transação').should('be.visible');
  });

  it('deve criar uma nova despesa', () => {
    cy.contains('button', 'Novo').click();
    
    // Preencher formulário
    cy.get('input[name="descricao"]').type('Teste de despesa E2E');
    cy.get('input[name="valor"]').type('150.00');
    cy.get('select[name="tipo"]').select('despesa');
    cy.get('input[name="data"]').type('2025-11-13');
    
    // Salvar
    cy.contains('button', 'Salvar').click();
    
    // Verificar se apareceu na lista
    cy.contains('Teste de despesa E2E').should('be.visible');
  });

  it('deve criar uma nova receita', () => {
    cy.contains('button', 'Novo').click();
    
    // Preencher formulário
    cy.get('input[name="descricao"]').type('Teste de receita E2E');
    cy.get('input[name="valor"]').type('500.00');
    cy.get('select[name="tipo"]').select('receita');
    cy.get('input[name="data"]').type('2025-11-13');
    
    // Salvar
    cy.contains('button', 'Salvar').click();
    
    // Verificar se apareceu na lista
    cy.contains('Teste de receita E2E').should('be.visible');
  });

  it('deve filtrar transações por tipo', () => {
    cy.get('select[name="filtro_tipo"]').select('despesa');
    cy.wait(500);
    
    // Verificar se só mostra despesas
    cy.contains('Despesa').should('be.visible');
  });
});
