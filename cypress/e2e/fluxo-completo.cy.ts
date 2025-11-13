describe('Fluxo Completo do Sistema Financeiro', () => {
  const timestamp = Date.now();
  const testEmail = `usuario@teste.com`;
  const testPassword = 'senha123';
  
  // Dados de teste
  const contaTeste = `Conta Corrente ${timestamp}`;
  const cartaoTeste = `Cartão Crédito ${timestamp}`;
  const categoriaTeste = `Categoria ${timestamp}`;
  const transacaoReceita = `Salário Teste ${timestamp}`;
  const transacaoDespesa = `Despesa Teste ${timestamp}`;

  it('deve completar o fluxo completo: login → criar recursos → transações → visualizar → logout', () => {
    // ===================================================
    // PASSO 1: LOGIN
    // ===================================================
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').should('be.visible').type(testEmail);
    cy.get('input[name="password"]').should('be.visible').type(testPassword);
    cy.get('button[type="submit"]').click();
    
    // Aguardar redirecionamento
    cy.url().should('match', /\/(workspace|dashboard)/);
    cy.wait(1000);

    // ===================================================
    // PASSO 2: VERIFICAR DASHBOARD INICIAL
    // ===================================================
    cy.visit('http://localhost:8080/dashboard');
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Saldo').should('be.visible');
    cy.wait(500);

    // ===================================================
    // PASSO 3: CRIAR UMA CONTA BANCÁRIA
    // ===================================================
    cy.visit('http://localhost:8080/accounts');
    cy.wait(1000);
    
    // Abrir modal de nova conta
    cy.contains('button', /nova conta|novo|adicionar/i).click();
    cy.wait(500);
    
    // Preencher formulário de conta
    cy.get('input[name="nome"]').clear().type(contaTeste);
    cy.get('select[name="tipo"]').select('corrente');
    cy.get('input[name="saldo_inicial"]').clear().type('5000');
    cy.get('input[name="banco"]').clear().type('Banco Teste');
    
    // Salvar conta
    cy.contains('button', /salvar|criar/i).click();
    cy.wait(1000);
    
    // Verificar se foi criada
    cy.contains(contaTeste).should('be.visible');

    // ===================================================
    // PASSO 4: CRIAR UM CARTÃO DE CRÉDITO
    // ===================================================
    cy.visit('http://localhost:8080/cards');
    cy.wait(1000);
    
    // Abrir modal de novo cartão
    cy.contains('button', /novo cartão|novo|adicionar/i).click();
    cy.wait(500);
    
    // Preencher formulário de cartão
    cy.get('input[name="nome"]').clear().type(cartaoTeste);
    cy.get('input[name="limite"]').clear().type('3000');
    cy.get('input[name="dia_fechamento"]').clear().type('15');
    cy.get('input[name="dia_vencimento"]').clear().type('25');
    cy.get('input[name="bandeira"]').clear().type('Visa');
    
    // Salvar cartão
    cy.contains('button', /salvar|criar/i).click();
    cy.wait(1000);
    
    // Verificar se foi criado
    cy.contains(cartaoTeste).should('be.visible');

    // ===================================================
    // PASSO 5: CRIAR UMA CATEGORIA
    // ===================================================
    cy.visit('http://localhost:8080/categories');
    cy.wait(1000);
    
    // Abrir modal de nova categoria
    cy.contains('button', /nova categoria|novo|adicionar/i).click();
    cy.wait(500);
    
    // Preencher formulário de categoria
    cy.get('input[name="nome"]').clear().type(categoriaTeste);
    cy.get('select[name="tipo"]').select('despesa');
    cy.get('input[name="cor"]').clear().type('#FF5733');
    
    // Salvar categoria
    cy.contains('button', /salvar|criar/i).click();
    cy.wait(1000);
    
    // Verificar se foi criada
    cy.contains(categoriaTeste).should('be.visible');

    // ===================================================
    // PASSO 6: CRIAR UMA TRANSAÇÃO DE RECEITA
    // ===================================================
    cy.visit('http://localhost:8080/transactions');
    cy.wait(1000);
    
    // Abrir modal de nova transação
    cy.contains('button', /nova transação|novo|adicionar/i).first().click();
    cy.wait(500);
    
    // Preencher formulário de receita
    cy.get('input[name="descricao"]').clear().type(transacaoReceita);
    cy.get('input[name="valor"]').clear().type('3500');
    cy.get('select[name="tipo"]').select('receita');
    cy.get('input[name="data"]').clear().type('2025-11-13');
    
    // Selecionar conta
    cy.get('select[name="conta_id"]').select(0); // Primeira conta disponível
    
    // Salvar transação
    cy.contains('button', /salvar|criar/i).click();
    cy.wait(1000);
    
    // Verificar se foi criada
    cy.contains(transacaoReceita).should('be.visible');

    // ===================================================
    // PASSO 7: CRIAR UMA TRANSAÇÃO DE DESPESA
    // ===================================================
    // Abrir modal de nova transação
    cy.contains('button', /nova transação|novo|adicionar/i).first().click();
    cy.wait(500);
    
    // Preencher formulário de despesa
    cy.get('input[name="descricao"]').clear().type(transacaoDespesa);
    cy.get('input[name="valor"]').clear().type('450.50');
    cy.get('select[name="tipo"]').select('despesa');
    cy.get('input[name="data"]').clear().type('2025-11-13');
    
    // Selecionar conta e categoria
    cy.get('select[name="conta_id"]').select(0);
    cy.get('select[name="categoria_id"]').select(0);
    
    // Salvar transação
    cy.contains('button', /salvar|criar/i).click();
    cy.wait(1000);
    
    // Verificar se foi criada
    cy.contains(transacaoDespesa).should('be.visible');

    // ===================================================
    // PASSO 8: FILTRAR TRANSAÇÕES
    // ===================================================
    // Filtrar por tipo: despesa
    cy.get('select[name="filtro_tipo"]').select('despesa');
    cy.wait(1000);
    cy.contains(transacaoDespesa).should('be.visible');
    
    // Filtrar por tipo: receita
    cy.get('select[name="filtro_tipo"]').select('receita');
    cy.wait(1000);
    cy.contains(transacaoReceita).should('be.visible');
    
    // Limpar filtro
    cy.get('select[name="filtro_tipo"]').select('todos');
    cy.wait(500);

    // ===================================================
    // PASSO 9: VISUALIZAR RELATÓRIOS/DASHBOARD ATUALIZADO
    // ===================================================
    cy.visit('http://localhost:8080/dashboard');
    cy.wait(1000);
    
    // Verificar se os valores foram atualizados
    cy.contains('Saldo Total').should('be.visible');
    cy.contains('Receitas').should('be.visible');
    cy.contains('Despesas').should('be.visible');
    cy.contains('R$').should('be.visible');
    
    // Verificar se o gráfico carregou
    cy.contains('Fluxo de Caixa').should('be.visible');

    // ===================================================
    // PASSO 10: VISUALIZAR DETALHES DE UMA TRANSAÇÃO
    // ===================================================
    cy.visit('http://localhost:8080/transactions');
    cy.wait(1000);
    
    // Clicar na primeira transação
    cy.contains(transacaoReceita).click();
    cy.wait(500);
    
    // Verificar se abriu modal/detalhes
    cy.contains(/detalhes|editar|informações/i).should('be.visible');
    
    // Fechar modal
    cy.get('button').contains(/fechar|cancelar/i).click();
    cy.wait(500);

    // ===================================================
    // PASSO 11: EDITAR UMA TRANSAÇÃO
    // ===================================================
    // Clicar em editar
    cy.contains(transacaoDespesa).parent().within(() => {
      cy.get('button').contains(/editar/i).click();
    });
    cy.wait(500);
    
    // Alterar valor
    cy.get('input[name="valor"]').clear().type('500');
    
    // Salvar alteração
    cy.contains('button', /salvar|atualizar/i).click();
    cy.wait(1000);
    
    // Verificar se foi atualizado
    cy.contains('500').should('be.visible');

    // ===================================================
    // PASSO 12: VERIFICAR ALERTAS/NOTIFICAÇÕES
    // ===================================================
    cy.visit('http://localhost:8080/alerts');
    cy.wait(1000);
    cy.contains(/alertas|notificações/i).should('be.visible');

    // ===================================================
    // PASSO 13: VERIFICAR PROJEÇÕES
    // ===================================================
    cy.visit('http://localhost:8080/projection');
    cy.wait(1000);
    cy.contains(/projeção|previsão/i).should('be.visible');

    // ===================================================
    // PASSO 14: LOGOUT
    // ===================================================
    // Abrir menu do usuário
    cy.get('[data-testid="user-menu"]').click();
    cy.wait(500);
    
    // Clicar em sair
    cy.contains(/sair|logout/i).click();
    cy.wait(1000);
    
    // Verificar se voltou para login
    cy.url().should('include', '/login');
    
    // Verificar se o token foi removido
    cy.window().then((win) => {
      const token = win.localStorage.getItem('token');
      expect(token).to.be.null;
    });

    // ===================================================
    // PASSO 15: VALIDAR QUE NÃO PODE ACESSAR SEM LOGIN
    // ===================================================
    cy.visit('http://localhost:8080/dashboard');
    cy.wait(1000);
    
    // Deve redirecionar para login
    cy.url().should('include', '/login');
  });

  // ===================================================
  // TESTE ADICIONAL: VALIDAÇÕES DE FORMULÁRIO
  // ===================================================
  it('deve validar campos obrigatórios em todos os formulários', () => {
    // Login
    cy.visit('http://localhost:8080/login');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('match', /\/(workspace|dashboard)/);
    cy.wait(1000);

    // Validar conta sem nome
    cy.visit('http://localhost:8080/accounts');
    cy.wait(1000);
    cy.contains('button', /nova conta|novo/i).click();
    cy.wait(500);
    cy.contains('button', /salvar/i).click();
    cy.contains(/obrigatório|required|preencha/i).should('be.visible');
    cy.get('button').contains(/cancelar|fechar/i).click();

    // Validar transação sem valor
    cy.visit('http://localhost:8080/transactions');
    cy.wait(1000);
    cy.contains('button', /nova transação|novo/i).first().click();
    cy.wait(500);
    cy.get('input[name="descricao"]').type('Teste sem valor');
    cy.contains('button', /salvar/i).click();
    cy.contains(/obrigatório|required|preencha/i).should('be.visible');
  });

  // ===================================================
  // TESTE ADICIONAL: RESPONSIVIDADE
  // ===================================================
  it('deve funcionar em diferentes resoluções', () => {
    const resolutions = [
      [1920, 1080], // Desktop
      [1366, 768],  // Laptop
      [768, 1024],  // Tablet
      [375, 667],   // Mobile
    ];
    
    resolutions.forEach(([width, height]) => {
      cy.viewport(width, height);
      
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').should('be.visible').type(testEmail);
      cy.get('input[name="password"]').should('be.visible').type(testPassword);
      cy.get('button[type="submit"]').should('be.visible').click();
      
      cy.url().should('match', /\/(workspace|dashboard)/);
      cy.wait(1000);
      
      // Verificar elementos principais
      cy.contains(/dashboard|início/i).should('be.visible');
      
      // Logout
      cy.get('[data-testid="user-menu"]').click();
      cy.contains(/sair/i).click();
      cy.wait(500);
    });
  });
});
