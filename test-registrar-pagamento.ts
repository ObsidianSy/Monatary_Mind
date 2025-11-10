import { Client } from 'pg';

const client = new Client({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
});

async function testRegistrarPagamento() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Buscar uma transação pendente
    const transacoesPendentes = await client.query(`
      SELECT t.*, cat.nome as categoria_nome
      FROM financeiro.transacao t
      LEFT JOIN financeiro.categoria cat ON t.categoria_id = cat.id
      WHERE t.tenant_id = 'obsidian' 
        AND t.status = 'previsto'
        AND t.tipo = 'debito'
      LIMIT 1
    `);

    if (transacoesPendentes.rows.length === 0) {
      console.log('❌ Nenhuma transação pendente encontrada');
      return;
    }

    const transacao = transacoesPendentes.rows[0];
    console.log('\n📋 Transação pendente encontrada:');
    console.log({
      id: transacao.id,
      descricao: transacao.descricao,
      valor: transacao.valor,
      tipo: transacao.tipo,
      conta_id: transacao.conta_id,
      categoria_id: transacao.categoria_id,
      categoria_nome: transacao.categoria_nome,
      status: transacao.status,
      data_transacao: transacao.data_transacao
    });

    // Campos necessários para UPDATE
    const camposObrigatorios = {
      id: transacao.id,
      tipo: transacao.tipo,
      valor: transacao.valor,
      descricao: transacao.descricao,
      data_transacao: new Date().toISOString().split('T')[0],
      conta_id: transacao.conta_id,
      categoria_id: transacao.categoria_id,
      status: 'liquidado',
      referencia: 'Teste de registro de pagamento',
      tenant_id: 'obsidian'
    };

    console.log('\n✅ Campos que serão enviados no UPDATE:');
    console.log(camposObrigatorios);

    // Validar campos obrigatórios
    if (!camposObrigatorios.categoria_id && (camposObrigatorios.tipo === 'credito' || camposObrigatorios.tipo === 'debito')) {
      console.log('❌ ERRO: categoria_id é obrigatória para crédito/débito');
      return;
    }

    console.log('\n✅ Validação OK - Todos os campos obrigatórios presentes');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

testRegistrarPagamento();
