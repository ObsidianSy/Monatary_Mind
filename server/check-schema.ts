import { query } from './database.js';

async function checkSchema() {
  console.log('🔍 Verificando schema financeiro...\n');
  
  try {
    // Verificar tabelas no schema financeiro
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'financeiro' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Tabelas encontradas no schema "financeiro" (${result.rows.length}):`);
    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
      
      // Verificar estrutura das principais tabelas
      console.log('\n🔍 Verificando estrutura das tabelas...\n');
      
      for (const table of result.rows) {
        const columns = await query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'financeiro' AND table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        console.log(`📋 ${table.table_name} (${columns.rows.length} colunas):`);
        columns.rows.slice(0, 5).forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        if (columns.rows.length > 5) {
          console.log(`   ... e mais ${columns.rows.length - 5} colunas`);
        }
        console.log('');
      }
    } else {
      console.log('   ⚠️ Nenhuma tabela encontrada no schema "financeiro"');
      console.log('   💡 As tabelas podem estar no schema "public"');
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

checkSchema();
