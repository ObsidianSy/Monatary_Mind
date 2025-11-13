describe('Fluxo de Categorias', () => {
  beforeEach(() => {
    // Login antes de cada teste
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type('usuario@teste.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/workspace');
    
    // Navegar para categorias
    cy.contains('Categorias').click();
  });

  it('deve listar categorias existentes', () => {
    cy.url().should('include', '/categories');
    cy.contains('Categorias').should('be.visible');
  });

  it('deve abrir modal de nova categoria', () => {
    cy.contains('button', 'Nova Categoria').click();
    cy.contains('Nova Categoria').should('be.visible');
  });

  it('deve criar uma nova categoria', () => {
    cy.contains('button', 'Nova Categoria').click();
    
    // Preencher formulário
    cy.get('input[name="nome"]').type('Categoria Teste E2E');
    cy.get('select[name="tipo"]').select('despesa');
    cy.get('input[name="cor"]').type('#FF5733');
    cy.get('input[name="icone"]').type('shopping-cart');
    
    // Salvar
    cy.contains('button', 'Salvar').click();
    
    // Verificar se apareceu na lista
    cy.contains('Categoria Teste E2E').should('be.visible');
  });

  it('deve filtrar categorias por tipo', () => {
    cy.get('select[name="filtro_tipo"]').select('receita');
    cy.wait(500);
    
    // Verificar filtro aplicado
    cy.contains('Receita').should('be.visible');
  });

  it('deve validar nome duplicado', () => {
    cy.contains('button', 'Nova Categoria').click();
    
    // Tentar criar categoria com nome existente
    cy.get('input[name="nome"]').type('Alimentação');
    cy.contains('button', 'Salvar').click();
    
    // Verificar mensagem de erro
    cy.contains('já existe').should('be.visible');
  });
});
