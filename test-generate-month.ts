import { Client } from 'pg';

const client = new Client({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
});

async function testGenerateMonth() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Buscar recorrências ativas
    const recorrenciasResult = await client.query(`
      SELECT *
      FROM financeiro.recorrencia
      WHERE tenant_id = 'obsidian'
        AND is_deleted = false
        AND is_paused = false
      LIMIT 5
    `);

    console.log(`\n📋 Recorrências ativas: ${recorrenciasResult.rows.length}`);
    console.table(recorrenciasResult.rows.map(r => ({
      id: r.id.substring(0, 8),
      descricao: r.descricao,
      valor: r.valor,
      frequencia: r.frequencia,
      dia_vencimento: r.dia_vencimento
    })));

    // Verificar transações existentes para novembro/2025
    const transacoesNovembro = await client.query(`
      SELECT *
      FROM financeiro.transacao
      WHERE tenant_id = 'obsidian'
        AND mes_referencia = '2025-11'
        AND origem LIKE 'recorrencia:%'
        AND is_deleted = false
    `);

    console.log(`\n📊 Transações já geradas para Novembro/2025: ${transacoesNovembro.rows.length}`);
    if (transacoesNovembro.rows.length > 0) {
      console.table(transacoesNovembro.rows.map(t => ({
        id: t.id.substring(0, 8),
        descricao: t.descricao,
        valor: t.valor,
        data: t.data_transacao,
        status: t.status,
        mes_ref: t.mes_referencia
      })));
    }

    console.log('\n✅ Teste concluído. Use o botão "Gerar Contas do Mês" na interface!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

testGenerateMonth();
