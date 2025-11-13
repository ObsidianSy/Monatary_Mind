describe('Fluxo de Cartões', () => {
  beforeEach(() => {
    // Login antes de cada teste
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Navegar para cartões
    cy.contains('Cartões').click();
  });

  it('deve listar cartões existentes', () => {
    cy.url().should('include', '/cards');
    cy.contains('Cartões').should('be.visible');
  });

  it('deve abrir modal de novo cartão', () => {
    cy.contains('button', 'Novo Cartão').click();
    cy.contains('Novo Cartão').should('be.visible');
  });

  it('deve criar um novo cartão', () => {
    cy.contains('button', 'Novo Cartão').click();
    
    // Preencher formulário
    cy.get('input[name="nome"]').type('Cartão Teste E2E');
    cy.get('input[name="limite"]').type('5000');
    cy.get('input[name="dia_fechamento"]').type('15');
    cy.get('input[name="dia_vencimento"]').type('25');
    cy.get('input[name="bandeira"]').type('Visa');
    
    // Salvar
    cy.contains('button', 'Salvar').click();
    
    // Verificar se apareceu na lista
    cy.contains('Cartão Teste E2E').should('be.visible');
  });

  it('deve visualizar detalhes de um cartão', () => {
    // Clicar no primeiro cartão da lista
    cy.get('[data-testid="card-item"]').first().click();
    
    // Verificar se mostra informações
    cy.contains('Limite').should('be.visible');
    cy.contains('Fatura').should('be.visible');
  });

  it('deve validar limite obrigatório', () => {
    cy.contains('button', 'Novo Cartão').click();
    
    // Tentar salvar sem preencher
    cy.get('input[name="nome"]').type('Cartão Sem Limite');
    cy.contains('button', 'Salvar').click();
    
    // Verificar mensagem de erro
    cy.contains('obrigatório').should('be.visible');
  });
});
