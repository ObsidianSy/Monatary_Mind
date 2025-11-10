import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
  console.log('🔨 Inicializando banco de dados...\n');
  
  try {
    // Ler o script SQL completo do diretório database (inclui auth-schema)
    const sqlPath = join(__dirname, '../database/init-complete.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Executando script SQL...');
    await pool.query(sql);
    
    console.log('✅ Banco de dados inicializado com sucesso!\n');
    
    // Verificar tabelas criadas no schema financeiro
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'financeiro' 
      ORDER BY table_name
    `);
    
  console.log(`📊 Tabelas no schema financeiro (${result.rows.length}):`);
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    console.log('\n✨ Pronto para usar!\n');
    
  } catch (error: any) {
    console.error('❌ Erro ao inicializar banco:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

initDatabase();
