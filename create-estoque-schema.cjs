const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
});

async function createEstoqueSchema() {
  try {
    await client.connect();
    console.log('\n✅ Conectado ao PostgreSQL\n');

    // Ler o arquivo SQL
    const sql = fs.readFileSync('database/create-estoque-schema.sql', 'utf8');
    
    console.log('📝 Executando SQL para criar schema de estoque...\n');
    
    // Executar o SQL
    await client.query(sql);
    
    console.log('✅ Schema e tabela de estoque criados com sucesso!\n');
    
    // Verificar se foi criado
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'estoque'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tabelas criadas no schema estoque:');
    result.rows.forEach(r => console.log(`  • ${r.table_name}`));

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
  }
}

createEstoqueSchema();
