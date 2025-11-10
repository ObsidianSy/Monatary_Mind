import { query } from './database';

async function testCompleteIntegration() {
  console.log('🧪 Teste Completo de Integração com PostgreSQL\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Teste de Conexão
    console.log('\n1️⃣ TESTE DE CONEXÃO');
    console.log('-'.repeat(60));
    const versionResult = await query('SELECT version(), current_database()');
    console.log('✅ Conectado ao PostgreSQL');
    console.log(`   Database: ${versionResult.rows[0].current_database}`);
    console.log(`   Version: ${versionResult.rows[0].version.split(',')[0]}`);
    
    // 2. Verificar Schema
    console.log('\n2️⃣ SCHEMA E TABELAS');
    console.log('-'.repeat(60));
    const searchPath = await query('SHOW search_path');
    console.log(`   Search Path: ${searchPath.rows[0].search_path}`);
    
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'financeiro' 
      ORDER BY table_name
    `);
    console.log(`   Tabelas encontradas: ${tables.rows.length}`);
    
    // 3. Contar Registros
    console.log('\n3️⃣ ESTATÍSTICAS DE DADOS');
    console.log('-'.repeat(60));
    
    const stats = [
      { table: 'conta', label: 'Contas' },
      { table: 'categoria', label: 'Categorias' },
      { table: 'transacao', label: 'Transações' },
      { table: 'cartao', label: 'Cartões' },
      { table: 'fatura', label: 'Faturas' },
      { table: 'recorrencia', label: 'Recorrências' },
    ];
    
    for (const { table, label } of stats) {
      const count = await query(`SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = 'obsidian'`);
      console.log(`   ${label.padEnd(15)}: ${count.rows[0].total} registros`);
    }
    
    // 4. Testar Views
    console.log('\n4️⃣ VIEWS DISPONÍVEIS');
    console.log('-'.repeat(60));
    
    const views = await query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'financeiro' 
      ORDER BY table_name
    `);
    
    views.rows.forEach(view => {
      console.log(`   ✓ ${view.table_name}`);
    });
    
    // 5. Testar Saldos
    console.log('\n5️⃣ TESTE DE SALDOS');
    console.log('-'.repeat(60));
    
    const saldos = await query(`
      SELECT * FROM vw_saldo_por_conta 
      WHERE conta_id IN (
        SELECT id FROM conta WHERE tenant_id = 'obsidian' LIMIT 5
      )
    `);
    
    if (saldos.rows.length > 0) {
      console.log(`   Contas com saldo calculado: ${saldos.rows.length}`);
      saldos.rows.forEach(conta => {
        console.log(`   - ${conta.conta_nome}: R$ ${parseFloat(conta.saldo_atual || 0).toFixed(2)}`);
      });
    } else {
      console.log('   ℹ️ Nenhuma conta com saldo cadastrada ainda');
    }
    
    // 6. Testar Categorias
    console.log('\n6️⃣ ESTRUTURA DE CATEGORIAS');
    console.log('-'.repeat(60));
    
    const categorias = await query(`
      SELECT c.nome, c.tipo, COUNT(s.id) as subcategorias
      FROM categoria c
      LEFT JOIN categoria s ON s.parent_id = c.id
      WHERE c.tenant_id = 'obsidian' AND c.parent_id IS NULL
      GROUP BY c.id, c.nome, c.tipo
      ORDER BY c.tipo, c.nome
      LIMIT 10
    `);
    
    if (categorias.rows.length > 0) {
      categorias.rows.forEach(cat => {
        console.log(`   ${cat.tipo.padEnd(10)} | ${cat.nome.padEnd(20)} (${cat.subcategorias} subcategorias)`);
      });
    } else {
      console.log('   ℹ️ Nenhuma categoria cadastrada');
    }
    
    // 7. Performance
    console.log('\n7️⃣ TESTE DE PERFORMANCE');
    console.log('-'.repeat(60));
    
    const start = Date.now();
    await query('SELECT COUNT(*) FROM transacao WHERE tenant_id = $1', ['obsidian']);
    const duration = Date.now() - start;
    console.log(`   Query de contagem: ${duration}ms`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n💡 Próximo passo: Execute `npm start` para iniciar frontend + backend\n');
    
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

testCompleteIntegration();
