describe('Fluxo de Contas', () => {
  beforeEach(() => {
    // Login antes de cada teste
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Navegar para contas
    cy.contains('Contas').click();
  });

  it('deve listar contas existentes', () => {
    cy.url().should('include', '/accounts');
    cy.contains('Contas').should('be.visible');
  });

  it('deve abrir modal de nova conta', () => {
    cy.contains('button', 'Nova Conta').click();
    cy.contains('Nova Conta').should('be.visible');
  });

  it('deve criar uma nova conta bancária', () => {
    cy.contains('button', 'Nova Conta').click();
    
    // Preencher formulário
    cy.get('input[name="nome"]').type('Conta Teste E2E');
    cy.get('select[name="tipo"]').select('corrente');
    cy.get('input[name="saldo_inicial"]').type('1000.00');
    cy.get('input[name="banco"]').type('Banco Teste');
    
    // Salvar
    cy.contains('button', 'Salvar').click();
    
    // Verificar se apareceu na lista
    cy.contains('Conta Teste E2E').should('be.visible');
  });

  it('deve exibir saldo da conta', () => {
    // Verificar se existe saldo visível
    cy.contains('Saldo').should('be.visible');
    cy.contains('R$').should('be.visible');
  });

  it('deve validar nome obrigatório', () => {
    cy.contains('button', 'Nova Conta').click();
    
    // Tentar salvar sem nome
    cy.get('input[name="saldo_inicial"]').type('500');
    cy.contains('button', 'Salvar').click();
    
    // Verificar mensagem de erro
    cy.contains('obrigatório').should('be.visible');
  });
});
