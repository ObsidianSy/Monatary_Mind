import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || '72.60.147.138',
  port: parseInt(process.env.DB_PORT || '5455'),
  database: process.env.DB_NAME || 'docker',
  user: process.env.DB_USER || 'docker',
  password: process.env.DB_PASSWORD || 'docker',
});

async function checkStructure() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando estrutura da tabela fatura_item...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'financeiro' 
        AND table_name = 'fatura_item'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Colunas encontradas:');
    console.table(result.rows);
    
    // Verificar alguns registros
    const samples = await client.query(`
      SELECT * FROM financeiro.fatura_item LIMIT 3;
    `);
    
    console.log('\n📝 Exemplo de dados:');
    console.table(samples.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkStructure();
