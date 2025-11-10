import { query } from './database';

// Script de teste de conexão e estrutura do banco

async function testConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...\n');
  
  try {
    // Teste 1: Conexão básica
    console.log('1️⃣ Teste de conexão básica...');
    const versionResult = await query('SELECT version(), current_database(), current_user');
    console.log('✅ Conectado!');
    console.log('   Database:', versionResult.rows[0].current_database);
    console.log('   User:', versionResult.rows[0].current_user);
    console.log('   Version:', versionResult.rows[0].version.split('\n')[0]);
    console.log('');

    // Teste 2: Listar tabelas
    console.log('2️⃣ Verificando tabelas existentes...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✅ Encontradas ${tablesResult.rows.length} tabelas:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    // Teste 3: Contar registros em cada tabela principal
    console.log('3️⃣ Contando registros...');
    const tablesToCheck = ['contas', 'categorias', 'transacoes', 'cartoes', 'faturas', 'recorrencias'];
    
    for (const table of tablesToCheck) {
      try {
        const countResult = await query(`SELECT COUNT(*) as total FROM ${table}`);
        console.log(`   ${table}: ${countResult.rows[0].total} registros`);
      } catch (error: any) {
        console.log(`   ${table}: ❌ Tabela não encontrada`);
      }
    }
    console.log('');

    // Teste 4: Estrutura da tabela contas
    console.log('4️⃣ Verificando estrutura da tabela "contas"...');
    try {
      const columnsResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'contas'
        ORDER BY ordinal_position
      `);
      console.log(`✅ Colunas da tabela contas:`);
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } catch (error: any) {
      console.log('   ❌ Tabela "contas" não encontrada');
    }
    console.log('');

    console.log('✅ Teste concluído com sucesso!\n');
    
  } catch (error: any) {
    console.error('❌ Erro durante os testes:');
    console.error('   ', error.message);
    console.error('\n🔧 Verifique:');
    console.error('   1. Se a senha no .env está correta');
    console.error('   2. Se o PostgreSQL está rodando');
    console.error('   3. Se a porta 5455 está acessível');
    process.exit(1);
  }
  
  process.exit(0);
}

testConnection();
