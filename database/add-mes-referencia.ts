import { Client } from 'pg';

const client = new Client({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
});

async function addMesReferenciaColumn() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Adicionar coluna mes_referencia
    console.log('\n📝 Adicionando coluna mes_referencia...');
    await client.query(`
      ALTER TABLE financeiro.transacao 
      ADD COLUMN IF NOT EXISTS mes_referencia VARCHAR(7)
    `);
    console.log('✅ Coluna mes_referencia adicionada');

    // Criar índice
    console.log('\n📝 Criando índice...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transacao_mes_referencia 
      ON financeiro.transacao(mes_referencia, tenant_id, status) 
      WHERE is_deleted = false
    `);
    console.log('✅ Índice criado');

    // Atualizar registros existentes
    console.log('\n📝 Atualizando registros existentes...');
    const result = await client.query(`
      UPDATE financeiro.transacao 
      SET mes_referencia = TO_CHAR(data_transacao, 'YYYY-MM')
      WHERE mes_referencia IS NULL 
        AND data_transacao IS NOT NULL
        AND is_deleted = false
    `);
    console.log(`✅ ${result.rowCount} registros atualizados`);

    // Verificar resultados
    console.log('\n📊 Verificando dados...');
    const stats = await client.query(`
      SELECT 
        mes_referencia,
        status,
        COUNT(*) as total
      FROM financeiro.transacao
      WHERE tenant_id = 'obsidian' 
        AND is_deleted = false
        AND mes_referencia IS NOT NULL
      GROUP BY mes_referencia, status
      ORDER BY mes_referencia DESC
      LIMIT 10
    `);

    console.log('\n📈 Transações por mês:');
    console.table(stats.rows);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

addMesReferenciaColumn();
