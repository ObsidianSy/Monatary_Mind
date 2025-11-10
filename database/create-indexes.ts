// Script para criar índices no PostgreSQL
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
});

async function createIndexes() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Criando índices no PostgreSQL...\n');
    
    const indexes = [
      {
        name: 'idx_transacao_tenant_data_deleted',
        sql: `CREATE INDEX IF NOT EXISTS idx_transacao_tenant_data_deleted 
              ON financeiro.transacao(tenant_id, data_transacao DESC) 
              WHERE is_deleted = false`
      },
      {
        name: 'idx_transacao_categoria',
        sql: `CREATE INDEX IF NOT EXISTS idx_transacao_categoria 
              ON financeiro.transacao(categoria_id) 
              WHERE is_deleted = false AND categoria_id IS NOT NULL`
      },
      {
        name: 'idx_transacao_conta',
        sql: `CREATE INDEX IF NOT EXISTS idx_transacao_conta 
              ON financeiro.transacao(conta_id) 
              WHERE is_deleted = false`
      },
      {
        name: 'idx_transacao_status',
        sql: `CREATE INDEX IF NOT EXISTS idx_transacao_status 
              ON financeiro.transacao(tenant_id, status, data_transacao DESC) 
              WHERE is_deleted = false`
      },
      {
        name: 'idx_categoria_parent',
        sql: `CREATE INDEX IF NOT EXISTS idx_categoria_parent 
              ON financeiro.categoria(parent_id) 
              WHERE is_deleted = false AND parent_id IS NOT NULL`
      }
    ];
    
    for (const index of indexes) {
      console.log(`⏳ Criando ${index.name}...`);
      const start = Date.now();
      await client.query(index.sql);
      const duration = Date.now() - start;
      console.log(`✅ ${index.name} criado em ${duration}ms\n`);
    }
    
    // Verificar índices criados
    const result = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'financeiro'
        AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);
    
    console.log('📊 Índices criados:');
    console.table(result.rows);
    
    console.log('\n✅ Todos os índices foram criados com sucesso!');
    console.log('🚀 Performance das queries deve melhorar significativamente.');
    
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createIndexes();
