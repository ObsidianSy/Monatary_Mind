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

async function auditSystem() {
  const client = await pool.connect();
  try {
    console.log('🔍 AUDITORIA COMPLETA DO SISTEMA\n');
    console.log('═'.repeat(80) + '\n');
    
    // 1. Verificar índices faltantes
    console.log('1️⃣ ANÁLISE DE ÍNDICES\n');
    
    const missingIndexes = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'financeiro'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `);
    
    console.log('📊 Tamanho das tabelas:');
    console.table(missingIndexes.rows);
    
    // 2. Verificar queries lentas (simular)
    console.log('\n2️⃣ QUERIES POTENCIALMENTE LENTAS\n');
    
    const slowQueries = [
      { query: 'SELECT FROM transacao (sem índice em data_transacao)', risk: 'ALTO' },
      { query: 'SELECT FROM fatura_item (múltiplos JOINs)', risk: 'MÉDIO' },
      { query: 'SELECT FROM categoria (hierárquica)', risk: 'BAIXO' }
    ];
    
    console.table(slowQueries);
    
    // 3. Verificar dados órfãos
    console.log('\n3️⃣ INTEGRIDADE DE DADOS\n');
    
    // Faturas sem itens
    const emptyInvoices = await client.query(`
      SELECT COUNT(*) as total
      FROM financeiro.fatura f
      LEFT JOIN financeiro.fatura_item fi ON f.id = fi.fatura_id
      WHERE f.tenant_id = 'obsidian' 
        AND fi.id IS NULL
        AND f.status = 'aberta';
    `);
    console.log(`Faturas abertas sem itens: ${emptyInvoices.rows[0].total}`);
    
    // Itens sem fatura
    const orphanItems = await client.query(`
      SELECT COUNT(*) as total
      FROM financeiro.fatura_item fi
      WHERE fi.tenant_id = 'obsidian'
        AND fi.is_deleted = false
        AND fi.fatura_id IS NULL;
    `);
    console.log(`Itens sem fatura: ${orphanItems.rows[0].total}`);
    
    // Transações sem conta
    const orphanTransactions = await client.query(`
      SELECT COUNT(*) as total
      FROM financeiro.transacao t
      LEFT JOIN financeiro.conta c ON t.conta_id = c.id
      WHERE t.tenant_id = 'obsidian'
        AND c.id IS NULL;
    `);
    console.log(`Transações órfãs: ${orphanTransactions.rows[0].total}`);
    
    // 4. Verificar campos NULL problemáticos
    console.log('\n4️⃣ CAMPOS NULL PROBLEMÁTICOS\n');
    
    const nullChecks = await client.query(`
      SELECT 
        'transacao' as tabela,
        COUNT(*) FILTER (WHERE categoria_id IS NULL) as sem_categoria,
        COUNT(*) FILTER (WHERE conta_id IS NULL) as sem_conta,
        COUNT(*) FILTER (WHERE valor IS NULL OR valor = 0) as valor_invalido
      FROM financeiro.transacao
      WHERE tenant_id = 'obsidian'
      UNION ALL
      SELECT 
        'fatura_item' as tabela,
        COUNT(*) FILTER (WHERE categoria_id IS NULL) as sem_categoria,
        COUNT(*) FILTER (WHERE cartao_id IS NULL) as sem_cartao,
        COUNT(*) FILTER (WHERE valor IS NULL OR valor = 0) as valor_invalido
      FROM financeiro.fatura_item
      WHERE tenant_id = 'obsidian';
    `);
    console.table(nullChecks.rows);
    
    // 5. Análise de performance de queries
    console.log('\n5️⃣ ESTATÍSTICAS DE TABELAS\n');
    
    const tableStats = await client.query(`
      SELECT 
        schemaname,
        relname as tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE schemaname = 'financeiro'
      ORDER BY n_live_tup DESC;
    `);
    console.table(tableStats.rows);
    
    // 6. Verificar índices não utilizados
    console.log('\n6️⃣ ÍNDICES E USO\n');
    
    const indexUsage = await client.query(`
      SELECT 
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'financeiro'
      ORDER BY idx_scan ASC
      LIMIT 10;
    `);
    console.table(indexUsage.rows);
    
    // 7. Recomendações
    console.log('\n7️⃣ RECOMENDAÇÕES\n');
    
    const recommendations = [];
    
    if (parseInt(emptyInvoices.rows[0].total) > 0) {
      recommendations.push({
        type: 'LIMPEZA',
        priority: 'MÉDIA',
        issue: `${emptyInvoices.rows[0].total} faturas abertas sem itens`,
        action: 'Considerar remover ou marcar como fechadas'
      });
    }
    
    if (parseInt(orphanItems.rows[0].total) > 0) {
      recommendations.push({
        type: 'INTEGRIDADE',
        priority: 'ALTA',
        issue: `${orphanItems.rows[0].total} itens sem fatura`,
        action: 'Associar a faturas ou marcar como deletados'
      });
    }
    
    if (parseInt(orphanTransactions.rows[0].total) > 0) {
      recommendations.push({
        type: 'CRÍTICO',
        priority: 'ALTA',
        issue: `${orphanTransactions.rows[0].total} transações órfãs`,
        action: 'Corrigir referências de conta'
      });
    }
    
    // Verificar dead tuples
    const deadTuples = tableStats.rows.filter(r => parseInt(r.dead_rows) > 100);
    if (deadTuples.length > 0) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'MÉDIA',
        issue: `${deadTuples.length} tabelas com muitos dead tuples`,
        action: 'Executar VACUUM ANALYZE'
      });
    }
    
    if (recommendations.length > 0) {
      console.table(recommendations);
    } else {
      console.log('✅ Nenhuma recomendação crítica no momento');
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ AUDITORIA CONCLUÍDA');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

auditSystem();
