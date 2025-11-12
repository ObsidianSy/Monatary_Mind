const { Pool } = require('pg');

const pool = new Pool({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
  ssl: false
});

async function checkColumns() {
  try {
    console.log('🔍 Verificando colunas da tabela financeiro.cartao...\n');

    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'financeiro' 
        AND table_name = 'cartao' 
      ORDER BY ordinal_position
    `);

    console.log('Colunas encontradas:');
    console.log('='.repeat(80));
    result.rows.forEach(row => {
      const nullable = row.is_nullable === 'NO' ? '(obrigatório)' : '(opcional)';
      const defaultVal = row.column_default ? ` [default: ${row.column_default}]` : '';
      console.log(`✓ ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });
    console.log('='.repeat(80));
    console.log(`\nTotal: ${result.rows.length} colunas\n`);

    // Verificar todas as tabelas
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'financeiro' 
      ORDER BY table_name
    `);

    console.log('📊 Tabelas no schema financeiro:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
